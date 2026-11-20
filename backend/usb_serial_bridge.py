"""Read JSON lines from ESP32-C3 USB serial and forward them to Flask."""
import json
import sys
import time
from typing import Any

import requests
import serial
from serial import SerialException

SERIAL_PORT = "COM3"          # Change if Windows assigns another COM port
SERIAL_BAUD = 115200
API_BASE = "http://127.0.0.1:5000"
LOCATION_URL = f"{API_BASE}/api/devices/location"
SOS_URL = f"{API_BASE}/api/devices/sos"


def forward_packet(packet: dict[str, Any]) -> None:
    packet_type = packet.get("type")
    if packet_type == "status":
        print(f"[ESP32] {packet.get('message', 'status')}")
        return

    device_id = packet.get("device_id")
    if not device_id:
        print("[SKIP] JSON packet has no device_id")
        return

    if packet_type == "location":
        # Flask's existing endpoint expects these exact field names.
        payload = {
            "device_id": device_id,
            "latitude": packet.get("latitude"),
            "longitude": packet.get("longitude"),
            "accuracy": packet.get("accuracy", 10.0),
            "satellites": packet.get("satellites", 0),
        }
        if payload["latitude"] is None or payload["longitude"] is None:
            print("[SKIP] Location packet has no valid GPS fix")
            return
        url = LOCATION_URL
    elif packet_type == "sos":
        payload = {
            "device_id": device_id,
            "latitude": packet.get("latitude"),
            "longitude": packet.get("longitude"),
            "trigger": packet.get("trigger", "physical_button"),
            "notes": "SOS button held for 2 seconds on ESP32-C3 USB tag.",
        }
        url = SOS_URL
    else:
        print(f"[SKIP] Unknown packet type: {packet_type!r}")
        return

    try:
        response = requests.post(url, json=payload, timeout=5)
        try:
            body = response.json()
        except ValueError:
            body = response.text[:300]
        if response.ok:
            print(f"[API OK] {packet_type} -> HTTP {response.status_code}: {body}")
        else:
            print(f"[API ERROR] {packet_type} -> HTTP {response.status_code}: {body}")
            if response.status_code == 404:
                print("Check that DEVICE_ID matches a device registered in the backend (project seed uses TAG001).")
    except requests.RequestException as exc:
        print(f"[API ERROR] Cannot reach Flask at {API_BASE}: {exc}")
        print("Start backend/app.py first, then restart this bridge.")


def main() -> None:
    print("QR-GPS USB Serial Bridge")
    print(f"Serial: {SERIAL_PORT} @ {SERIAL_BAUD}")
    print(f"Flask:  {API_BASE}")
    print("Close Arduino Serial Monitor before starting; only one program can own COM3.")
    try:
        with serial.Serial(SERIAL_PORT, SERIAL_BAUD, timeout=1) as ser:
            # Opening a serial port may reset the ESP32-C3; allow it to boot.
            time.sleep(2)
            ser.reset_input_buffer()
            print("[USB OK] Connected. Waiting for ESP32 JSON lines...")
            while True:
                raw = ser.readline()
                if not raw:
                    continue
                line = raw.decode("utf-8", errors="replace").strip()
                if not line:
                    continue
                try:
                    packet = json.loads(line)
                except json.JSONDecodeError:
                    # Ignore bootloader text/noise; firmware data should be JSON lines.
                    print(f"[SERIAL] Non-JSON: {line}")
                    continue
                if isinstance(packet, dict):
                    forward_packet(packet)
    except KeyboardInterrupt:
        print("\nBridge stopped by user.")
    except SerialException as exc:
        print(f"[SERIAL ERROR] Could not open {SERIAL_PORT}: {exc}")
        print("Check Device Manager > Ports (COM & LPT), select the correct COM port, and close Arduino Serial Monitor.")
        sys.exit(1)


if __name__ == "__main__":
    main()
