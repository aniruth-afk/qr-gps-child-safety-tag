# QR-GPS Child Safety Tag - REST API Documentation

This document describes the API contract for communication between the ESP32 IoT hardware tag, the web frontend, and the Python Flask backend with SQLite storage.

---

## Base URLs
- Local Development (Flask): `http://127.0.0.1:5000`
- Production / Cloud Run: `https://your-child-safety-server.com`

---

## 1. Device Telemetry & Ingestion

### `POST /api/devices/location`
Submits real-time GPS telemetry from the ESP32 hardware tag. Automatically runs Haversine distance safe-zone calculation and polyline cross-track route compliance.

#### Request Headers
```http
Content-Type: application/json
```

#### Request Payload
```json
{
  "device_id": "TAG001",
  "latitude": 9.92750,
  "longitude": 78.12240,
  "accuracy": 6.5,
  "batteryPercent": 85,
  "speedKmh": 3.8,
  "satellites": 8,
  "timestamp": "2026-10-19T10:30:00Z"
}
```

#### Field Validation Rules
| Field | Type | Required | Description |
|---|---|---|---|
| `device_id` | String | Yes | Unique hardware tag identifier (e.g. `TAG001`) |
| `latitude` | Float | Yes | Decimal latitude in range `[-90.0, 90.0]` |
| `longitude` | Float | Yes | Decimal longitude in range `[-180.0, 180.0]` |
| `accuracy` | Float | No | Horizontal dilution of precision in meters |
| `batteryPercent` | Integer | No | Measured LiPo battery level `0..100` (or `null` if hardware omits) |

#### Success Response (`200 OK`)
```json
{
  "status": "success",
  "device_id": "TAG001",
  "child_name": "Aarav Martinez",
  "geofence_status": "IN_SAFE_ZONE",
  "distance_from_center_m": 88.4,
  "timestamp": "2026-10-19T10:30:01Z"
}
```

---

## 2. Emergency SOS Incident Reporting

### `POST /api/devices/sos`
Dispatched when the child presses the physical push button on the ESP32 tag or during guardian emergency drills.

#### Request Payload
```json
{
  "device_id": "TAG001",
  "latitude": 9.92750,
  "longitude": 78.12240,
  "trigger": "physical_button",
  "notes": "Hardware tactile push button held down for 2s."
}
```

#### Response (`201 Created`)
```json
{
  "status": "SOS_DISPATCHED",
  "incident_id": "INC_a8f9c1",
  "child_name": "Aarav Martinez",
  "emergency_phone": "+1 (555) 234-5678",
  "timestamp": "2026-10-19T10:30:02Z"
}
```

---

## 3. Dynamic QR Identification Lookup

### `GET /api/qr/scan/<token>`
Accessed when a smartphone scans the child's printed ID card or pin tag.

#### Access Control Matrix
- **Public Anonymous Scanner (No Auth Header):**
  - Returns ONLY child first name, school name, and emergency phone call trigger.
  - Strictly conceals residential home address and live GPS coordinates.
- **Authorized Guardian / Admin (`Authorization: Bearer <token>`):**
  - Returns complete medical notes, alternate contacts, home address coordinates, and real-time GPS coordinates.

#### Anonymous Response (`200 OK`)
```json
{
  "valid": true,
  "access_level": "public_anonymous",
  "child_first_name": "Aarav",
  "school_name": "St. Xavier Model Academy",
  "emergency_contact_phone": "+1 (555) 234-5678",
  "notes": "Allergic to penicillin. Inhaler in backpack."
}
```

#### Revoked Tag Response (`410 Gone`)
```json
{
  "valid": false,
  "revoked": true,
  "message": "This safety tag was revoked or reported lost."
}
```

---

## 4. Token Lifecycle Management

### `POST /api/qr/revoke`
Invalidates a lost or stolen tag token.

### `POST /api/qr/regenerate`
Issues a fresh opaque token without requiring replacement of the microcontroller.
