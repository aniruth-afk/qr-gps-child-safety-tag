-- SQLite Schema for QR-GPS Child Safety Tag

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'guardian',
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS children (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    blood_group TEXT DEFAULT 'O+',
    guardian_id TEXT REFERENCES users(id),
    guardian_name TEXT NOT NULL,
    guardian_phone TEXT NOT NULL,
    emergency_contact_alt TEXT,
    school_name TEXT,
    device_id TEXT UNIQUE NOT NULL,
    safe_zone_radius_meters INTEGER DEFAULT 250,
    home_lat REAL NOT NULL,
    home_lng REAL NOT NULL,
    qr_token TEXT UNIQUE NOT NULL,
    qr_revoked BOOLEAN DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gps_readings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    accuracy REAL DEFAULT 8.0,
    speed_kmh REAL DEFAULT 0.0,
    battery_percent INTEGER,
    geofence_status TEXT DEFAULT 'IN_SAFE_ZONE',
    route_status TEXT DEFAULT 'ON_ROUTE',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS emergency_incidents (
    id TEXT PRIMARY KEY,
    child_id TEXT NOT NULL REFERENCES children(id),
    device_id TEXT NOT NULL,
    trigger_type TEXT NOT NULL,
    status TEXT DEFAULT 'unresolved',
    event_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    latitude REAL,
    longitude REAL,
    acknowledged_at TIMESTAMP,
    acknowledged_by TEXT,
    resolved_at TIMESTAMP,
    resolved_by TEXT,
    resolution_notes TEXT
);

CREATE TABLE IF NOT EXISTS safe_zones (
    id TEXT PRIMARY KEY,
    child_id TEXT NOT NULL REFERENCES children(id),
    name TEXT NOT NULL,
    center_lat REAL NOT NULL,
    center_lng REAL NOT NULL,
    radius_meters INTEGER DEFAULT 250,
    is_active BOOLEAN DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_gps_device_time ON gps_readings(device_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_children_qr_token ON children(qr_token);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON emergency_incidents(status);
