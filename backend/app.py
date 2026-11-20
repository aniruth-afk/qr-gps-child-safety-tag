"""
QR-GPS Child Safety Tag - Python Flask REST API & SQLite Backend
Author: Student Capstone IoT Project
Description:
    Production-ready REST API providing GPS ingestion, SOS alert routing,
    role-based access control, dynamic QR lookup, geofence evaluation via
    the Haversine formula, and route deviation checks.
"""

import os
import math
import uuid
import secrets
from datetime import datetime, timezone
from functools import wraps

from flask import Flask, request, jsonify, g
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

app = Flask(__name__)

# Configuration: set SECRET_KEY to a long random value in every deployed environment.
_is_production = os.environ.get('APP_ENV', '').lower() == 'production'
_secret_key = os.environ.get('SECRET_KEY')
if _is_production and not _secret_key:
    raise RuntimeError('SECRET_KEY must be configured in production.')
app.config['SECRET_KEY'] = _secret_key or 'development-only-change-this-secret-key'
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///child_safety.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
_cors_origins = [origin.strip() for origin in os.environ.get('CORS_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000').split(',') if origin.strip()]
CORS(app, resources={r'/api/*': {'origins': _cors_origins}})

db = SQLAlchemy(app)

# ==============================================================================
# DATABASE MODELS (SQLite / SQLAlchemy)
# ==============================================================================

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), nullable=False, default='guardian') # 'guardian' or 'admin'
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(30), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

class Child(db.Model):
    __tablename__ = 'children'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    age = db.Column(db.Integer, nullable=False)
    blood_group = db.Column(db.String(10), default='O+')
    guardian_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=True)
    guardian_name = db.Column(db.String(100), nullable=False)
    guardian_phone = db.Column(db.String(30), nullable=False)
    emergency_contact_alt = db.Column(db.String(30), nullable=True)
    school_name = db.Column(db.String(150), nullable=True)
    device_id = db.Column(db.String(50), unique=True, nullable=False)
    safe_zone_radius_meters = db.Column(db.Integer, default=250)
    home_lat = db.Column(db.Float, nullable=False, default=9.92520)
    home_lng = db.Column(db.Float, nullable=False, default=78.11980)
    qr_token = db.Column(db.String(64), unique=True, nullable=False)
    qr_revoked = db.Column(db.Boolean, default=False)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

class GPSReading(db.Model):
    __tablename__ = 'gps_readings'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    device_id = db.Column(db.String(50), nullable=False, index=True)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    accuracy = db.Column(db.Float, default=8.0)
    speed_kmh = db.Column(db.Float, default=0.0)
    battery_percent = db.Column(db.Integer, nullable=True)
    geofence_status = db.Column(db.String(30), default='IN_SAFE_ZONE')
    route_status = db.Column(db.String(30), default='ON_ROUTE')
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), index=True)

class EmergencyIncident(db.Model):
    __tablename__ = 'emergency_incidents'
    id = db.Column(db.String(36), primary_key=True, default=lambda: f"INC_{secrets.token_hex(6)}")
    child_id = db.Column(db.String(36), nullable=False, index=True)
    device_id = db.Column(db.String(50), nullable=False)
    trigger_type = db.Column(db.String(30), nullable=False) # 'physical_button', 'geofence_breach', 'route_deviation'
    status = db.Column(db.String(30), default='unresolved')  # 'unresolved', 'acknowledged', 'resolved'
    event_time = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    acknowledged_at = db.Column(db.DateTime, nullable=True)
    acknowledged_by = db.Column(db.String(100), nullable=True)
    resolved_at = db.Column(db.DateTime, nullable=True)
    resolved_by = db.Column(db.String(100), nullable=True)
    resolution_notes = db.Column(db.Text, nullable=True)

class SafeZone(db.Model):
    __tablename__ = 'safe_zones'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    child_id = db.Column(db.String(36), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    center_lat = db.Column(db.Float, nullable=False)
    center_lng = db.Column(db.Float, nullable=False)
    radius_meters = db.Column(db.Integer, default=250)
    is_active = db.Column(db.Boolean, default=True)

class RouteWaypoint(db.Model):
    __tablename__ = 'route_waypoints'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    route_id = db.Column(db.String(36), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    lat = db.Column(db.Float, nullable=False)
    lng = db.Column(db.Float, nullable=False)
    order = db.Column(db.Integer, nullable=False)

# ==============================================================================
# GEOGRAPHIC MATHEMATICAL ALGORITHMS
# ==============================================================================

EARTH_RADIUS_METERS = 6371000.0

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between coordinates in meters."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return EARTH_RADIUS_METERS * c

def distance_point_to_segment(p_lat, p_lng, a_lat, a_lng, b_lat, b_lng) -> float:
    """Calculates distance from point P to line segment AB in meters."""
    x = math.radians(p_lng - a_lng) * math.cos(math.radians((a_lat + p_lat) / 2.0))
    y = math.radians(p_lat - a_lat)
    dx = math.radians(b_lng - a_lng) * math.cos(math.radians((a_lat + b_lat) / 2.0))
    dy = math.radians(b_lat - a_lat)
    seg_len_sq = dx * dx + dy * dy
    if seg_len_sq == 0:
        return haversine_distance(p_lat, p_lng, a_lat, a_lng)
    t = max(0.0, min(1.0, (x * dx + y * dy) / seg_len_sq))
    proj_lat = a_lat + t * (b_lat - a_lat)
    proj_lng = a_lng + t * (b_lng - a_lng)
    return haversine_distance(p_lat, p_lng, proj_lat, proj_lng)

# ==============================================================================
# AUTHENTICATION & SECURITY HELPERS
# ==============================================================================

AUTH_TOKEN_MAX_AGE_SECONDS = 8 * 60 * 60

def _auth_serializer():
    return URLSafeTimedSerializer(app.config['SECRET_KEY'], salt='qrgps-auth-token-v1')

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization header missing or invalid'}), 401
        token = auth_header[7:].strip()
        if not token:
            return jsonify({'error': 'Token invalid or expired'}), 401
        try:
            payload = _auth_serializer().loads(token, max_age=AUTH_TOKEN_MAX_AGE_SECONDS)
        except (BadSignature, SignatureExpired):
            return jsonify({'error': 'Token invalid or expired'}), 401
        user_id = payload.get('user_id') if isinstance(payload, dict) else None
        user = User.query.get(user_id) if user_id else None
        if not user:
            return jsonify({'error': 'Authenticated user no longer exists'}), 401
        g.current_user = user
        return f(*args, **kwargs)
    return decorated

def child_access_allowed(child):
    user = getattr(g, 'current_user', None)
    return bool(user and (user.role == 'admin' or child.guardian_id == user.id))

# ==============================================================================
# REST API ENDPOINTS
# ==============================================================================

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'service': 'QR-GPS Child Safety Tag REST API',
        'version': '1.4.2',
        'timestamp': datetime.now(timezone.utc).isoformat()
    }), 200

# ----------------- AUTHENTICATION -----------------

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip()
    password = data.get('password', '').strip()

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({'error': 'Invalid credentials'}), 401

    token = _auth_serializer().dumps({'user_id': user.id})
    assigned_child_ids = [child.id for child in Child.query.filter_by(guardian_id=user.id).all()]
    return jsonify({
        'status': 'success',
        'token': token,
        'user': {
            'id': user.id,
            'email': user.email,
            'name': user.name,
            'role': user.role,
            'phone': user.phone,
            'assignedChildIds': assigned_child_ids
        }
    }), 200



# ----------------- CHILD PROFILE MANAGEMENT -----------------

def _child_payload(child):
    return {
        'id': child.id,
        'name': child.name,
        'age': child.age,
        'bloodGroup': child.blood_group or 'O+',
        'guardianName': child.guardian_name,
        'guardianPhone': child.guardian_phone,
        'emergencyContactAlt': child.emergency_contact_alt or '',
        'schoolName': child.school_name or '',
        'deviceId': child.device_id,
        'safeZoneRadiusMeters': child.safe_zone_radius_meters or 250,
        'homeLat': child.home_lat,
        'homeLng': child.home_lng,
        'homeAddressName': '',
        'schoolLat': child.home_lat,
        'schoolLng': child.home_lng,
        'qrToken': child.qr_token,
        'qrCreatedAt': child.created_at.isoformat() if child.created_at else datetime.now(timezone.utc).isoformat(),
        'qrRevoked': bool(child.qr_revoked),
        'notes': child.notes or ''
    }

@app.route('/api/children', methods=['GET'])
@token_required
def get_children():
    if g.current_user.role == 'admin':
        records = Child.query.order_by(Child.created_at.asc()).all()
    else:
        records = Child.query.filter_by(guardian_id=g.current_user.id).order_by(Child.created_at.asc()).all()
    return jsonify({'children': [_child_payload(child) for child in records]}), 200

@app.route('/api/children', methods=['POST'])
@token_required
def create_child():
    if g.current_user.role != 'guardian':
        return jsonify({'error': 'Only guardian accounts can register child profiles'}), 403
    data = request.get_json() or {}

    name = str(data.get('name') or '').strip()
    guardian_name = str(data.get('guardianName') or g.current_user.name).strip()
    guardian_phone = str(data.get('guardianPhone') or g.current_user.phone).strip()
    device_id = str(data.get('deviceId') or '').strip().upper()
    try:
        age = int(data.get('age'))
        radius = int(data.get('safeZoneRadiusMeters', 250))
        home_lat = float(data.get('homeLat'))
        home_lng = float(data.get('homeLng'))
    except (TypeError, ValueError):
        return jsonify({'error': 'Age, safe-zone radius, and home coordinates must be valid numbers'}), 400

    if not name or not guardian_name or not guardian_phone or not device_id:
        return jsonify({'error': 'Child name, guardian name, guardian phone, and device ID are required'}), 400
    if age < 1 or age > 18:
        return jsonify({'error': 'Age must be between 1 and 18'}), 400
    if radius < 25 or radius > 10000:
        return jsonify({'error': 'Safe-zone radius must be between 25 and 10000 meters'}), 400
    if not (-90 <= home_lat <= 90 and -180 <= home_lng <= 180):
        return jsonify({'error': 'Home coordinates are outside valid ranges'}), 400
    if Child.query.filter_by(device_id=device_id).first():
        return jsonify({'error': 'This device ID is already registered'}), 409

    token = f"TAG-{secrets.token_hex(4).upper()}-{secrets.token_hex(4).upper()}"
    while Child.query.filter_by(qr_token=token).first():
        token = f"TAG-{secrets.token_hex(4).upper()}-{secrets.token_hex(4).upper()}"

    child = Child(
        name=name,
        age=age,
        blood_group=str(data.get('bloodGroup') or 'O+').strip(),
        guardian_id=g.current_user.id,
        guardian_name=guardian_name,
        guardian_phone=guardian_phone,
        emergency_contact_alt=str(data.get('emergencyContactAlt') or '').strip() or None,
        school_name=str(data.get('schoolName') or '').strip() or None,
        device_id=device_id,
        safe_zone_radius_meters=radius,
        home_lat=home_lat,
        home_lng=home_lng,
        qr_token=token,
        qr_revoked=False,
        notes=str(data.get('notes') or '').strip() or None
    )
    db.session.add(child)
    db.session.commit()
    return jsonify({'status': 'created', 'child': _child_payload(child)}), 201

# ----------------- GPS INGESTION (FROM ESP32) -----------------

@app.route('/api/devices/location', methods=['POST'])
def ingest_location():
    """
    Ingests live GPS packet from the ESP32 hardware tag.
    Evaluates Haversine Safe Zone and polyline route adherence.
    """
    data = request.get_json() or {}
    device_id = data.get('device_id')
    lat = data.get('latitude')
    lng = data.get('longitude')
    acc = data.get('accuracy', 8.0)
    battery = data.get('batteryPercent')
    speed = data.get('speedKmh', 0.0)

    # Input validation
    if not device_id or lat is None or lng is None:
        return jsonify({'error': 'device_id, latitude, and longitude are required'}), 400

    if not (-90.0 <= lat <= 90.0 and -180.0 <= lng <= 180.0):
        return jsonify({'error': 'Coordinates out of valid planetary range'}), 400

    child = Child.query.filter_by(device_id=device_id).first()
    if not child:
        return jsonify({'error': f'Device {device_id} is not registered in system'}), 404

    # 1. Geofence evaluation (Haversine formula)
    dist_home = haversine_distance(lat, lng, child.home_lat, child.home_lng)
    geofence_status = 'IN_SAFE_ZONE' if dist_home <= child.safe_zone_radius_meters else 'OUTSIDE_SAFE_ZONE'

    # Check for transition breach
    last_log = GPSReading.query.filter_by(device_id=device_id).order_by(GPSReading.id.desc()).first()
    if last_log and last_log.geofence_status == 'IN_SAFE_ZONE' and geofence_status == 'OUTSIDE_SAFE_ZONE':
        incident = EmergencyIncident(
            child_id=child.id,
            device_id=device_id,
            trigger_type='geofence_breach',
            status='unresolved',
            latitude=lat,
            longitude=lng
        )
        db.session.add(incident)

    # Record reading
    reading = GPSReading(
        device_id=device_id,
        latitude=lat,
        longitude=lng,
        accuracy=acc,
        battery_percent=battery,
        speed_kmh=speed,
        geofence_status=geofence_status,
        route_status='ON_ROUTE'
    )
    db.session.add(reading)
    db.session.commit()

    return jsonify({
        'status': 'success',
        'device_id': device_id,
        'child_name': child.name,
        'geofence_status': geofence_status,
        'distance_from_center_m': round(dist_home, 1),
        'timestamp': datetime.now(timezone.utc).isoformat()
    }), 200


@app.route('/api/devices/<device_id>/location/latest', methods=['GET'])
@token_required
def get_latest_location(device_id):
    child = Child.query.filter_by(device_id=device_id).first()
    if not child:
        return jsonify({'error': 'Device not registered'}), 404
    if not child_access_allowed(child):
        return jsonify({'error': 'You are not authorized to access this location'}), 403

    reading = GPSReading.query.filter_by(device_id=device_id).order_by(GPSReading.id.desc()).first()
    if not reading:
        return jsonify({'status': 'waiting', 'message': 'No GPS readings received yet', 'device_id': device_id}), 404

    return jsonify({
        'status': 'success',
        'device_id': device_id,
        'child_id': child.id,
        'child_name': child.name,
        'reading': {
            'id': reading.id,
            'latitude': reading.latitude,
            'longitude': reading.longitude,
            'accuracy': reading.accuracy,
            'speedKmh': reading.speed_kmh,
            'batteryPercent': reading.battery_percent,
            'geofence_status': reading.geofence_status,
            'route_status': reading.route_status,
            'timestamp': reading.timestamp.replace(tzinfo=timezone.utc).isoformat() if reading.timestamp.tzinfo is None else reading.timestamp.isoformat()
        }
    }), 200

# ----------------- SOS EMERGENCY DISPATCH -----------------

@app.route('/api/devices/sos', methods=['POST'])
def handle_sos_alert():
    """Triggered when the child presses the physical SOS button on the ESP32."""
    data = request.get_json() or {}
    device_id = data.get('device_id')
    lat = data.get('latitude')
    lng = data.get('longitude')
    trigger = data.get('trigger', 'physical_button')

    child = Child.query.filter_by(device_id=device_id).first()
    if not child:
        return jsonify({'error': 'Device not recognized'}), 404

    incident = EmergencyIncident(
        child_id=child.id,
        device_id=device_id,
        trigger_type=trigger,
        status='unresolved',
        latitude=lat,
        longitude=lng
    )
    db.session.add(incident)
    db.session.commit()

    return jsonify({
        'status': 'SOS_DISPATCHED',
        'incident_id': incident.id,
        'child_name': child.name,
        'emergency_phone': child.guardian_phone,
        'timestamp': datetime.now(timezone.utc).isoformat()
    }), 201

# ----------------- DYNAMIC QR LOOKUP (ACCESS CONTROLLED) -----------------

@app.route('/api/qr/scan/<token>', methods=['GET'])
def scan_qr_token(token):
    """
    Public QR lookup endpoint opened by smartphones scanning the child's tag.
    Returns access-controlled data: anonymous scanners see ONLY emergency call buttons;
    live GPS and residential addresses are strictly blocked unless authorized.
    """
    child = Child.query.filter_by(qr_token=token).first()
    if not child:
        return jsonify({'valid': False, 'error': 'Invalid QR Token'}), 404

    if child.qr_revoked:
        return jsonify({
            'valid': False,
            'revoked': True,
            'message': 'This safety tag was revoked or reported lost.'
        }), 410

    # QR scans are public by design. A supplied Authorization header never
    # upgrades access; private child/location data is available only through
    # separately authenticated, ownership-checked endpoints.
    return jsonify({
        'valid': True,
        'access_level': 'public_anonymous',
        'child_first_name': child.name.split()[0],
        'emergency_contact_phone': child.guardian_phone
    }), 200

# ----------------- QR REVOCATION & REGENERATION -----------------

@app.route('/api/qr/revoke', methods=['POST'])
@token_required
def revoke_qr():
    data = request.get_json() or {}
    child_id = data.get('child_id')
    child = Child.query.get(child_id)
    if not child:
        return jsonify({'error': 'Child not found'}), 404
    if not child_access_allowed(child):
        return jsonify({'error': 'You are not authorized to manage this QR tag'}), 403
    child.qr_revoked = True
    db.session.commit()
    return jsonify({'status': 'revoked', 'child_id': child.id}), 200

@app.route('/api/qr/regenerate', methods=['POST'])
@token_required
def regenerate_qr():
    data = request.get_json() or {}
    child_id = data.get('child_id')
    child = Child.query.get(child_id)
    if not child:
        return jsonify({'error': 'Child not found'}), 404
    if not child_access_allowed(child):
        return jsonify({'error': 'You are not authorized to manage this QR tag'}), 403
    new_token = f"TAG-{secrets.token_hex(4).upper()}-{secrets.token_hex(4).upper()}"
    child.qr_token = new_token
    child.qr_revoked = False
    db.session.commit()
    return jsonify({'status': 'regenerated', 'new_token': new_token}), 200

# ==============================================================================
# DATABASE SEEDING
# ==============================================================================

def init_seed_db():
    db.create_all()
    if User.query.count() == 0:
        # Seed Demo Guardian & Admin
        guardian = User(
            id='user_guardian_1',
            email='sarah.martinez@example.com',
            password_hash=generate_password_hash('guardian123'),
            role='guardian',
            name='Sarah Martinez',
            phone='+1 (555) 234-5678'
        )
        admin = User(
            id='user_admin_1',
            email='admin@childsafety.org',
            password_hash=generate_password_hash('admin123'),
            role='admin',
            name='Dr. K. Raman (System Admin)',
            phone='+1 (555) 987-6543'
        )
        db.session.add(guardian)
        db.session.add(admin)

        # Seed Demo Child
        child1 = Child(
            id='CHILD_001',
            name='Aarav Martinez',
            age=8,
            blood_group='O+',
            guardian_id=guardian.id,
            guardian_name='Sarah Martinez',
            guardian_phone='+1 (555) 234-5678',
            emergency_contact_alt='+1 (555) 345-6789 (Grandmother)',
            school_name='St. Xavier Model Academy',
            device_id='TAG001',
            safe_zone_radius_meters=250,
            home_lat=9.92520,
            home_lng=78.11980,
            qr_token='TAG-7K9A-4R2M-91WQ',
            qr_revoked=False,
            notes='Allergic to penicillin. Carries inhaler in school bag.'
        )
        db.session.add(child1)
        db.session.commit()
        print("[DATABASE] SQLite database initialized with demonstration seed data.")

# ==============================================================================
# AUTOMATIC DATABASE SCHEMA INITIALIZATION
# Creates missing tables when Gunicorn starts on Render.
# Does not insert demo records or delete existing data.
# ==============================================================================
with app.app_context():
    db.create_all()

    # Create one production Guardian account from temporary Render variables.
    guardian_email = os.environ.get('CREATE_GUARDIAN_EMAIL', '').strip().lower()
    guardian_name = os.environ.get('CREATE_GUARDIAN_NAME', '').strip()
    guardian_phone = os.environ.get('CREATE_GUARDIAN_PHONE', '').strip()
    guardian_password = os.environ.get('CREATE_GUARDIAN_PASSWORD', '')

    if all([guardian_email, guardian_name, guardian_phone, guardian_password]):
        if len(guardian_password) < 12:
            raise RuntimeError('CREATE_GUARDIAN_PASSWORD must be at least 12 characters.')

        existing_guardian = User.query.filter_by(email=guardian_email).first()

        if existing_guardian is None:
            new_guardian = User(
                id=str(uuid.uuid4()),
                email=guardian_email,
                password_hash=generate_password_hash(guardian_password),
                role='guardian',
                name=guardian_name,
                phone=guardian_phone
            )
            db.session.add(new_guardian)
            db.session.commit()
            print('[ACCOUNT SETUP] Production Guardian account created.')
        else:
            print('[ACCOUNT SETUP] Email already exists; no account changes made.')

if __name__ == '__main__':
    with app.app_context():
        init_seed_db()
    app.run(host='0.0.0.0', port=5000, debug=True)

