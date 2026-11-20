# Hardware Wiring & Schematic Guide

## System Components
1. **ESP32 DevKit V1** (30-pin, dual-core Xtensa 240 MHz, 2.4 GHz Wi-Fi)
2. **u-blox NEO-6M GPS Receiver** with integrated ceramic patch antenna
3. **Tactile Push Button** (12mm momentary switch for SOS alarm)
4. **Active 5V Piezo Buzzer**
5. **TP4056 1S Lithium Battery Charger** with Type-C input and protection IC
6. **3.7V 1000mAh Single-cell Li-Po Battery**
7. **Laminated PVC QR Code Badge** (Attached to lanyard or backpack pin)

---

## Complete Wiring Table

| Peripheral Module | Peripheral Pin | ESP32 Board Pin | Notes |
|---|---|---|---|
| **NEO-6M GPS** | VCC | 3.3V or VIN | Connect to 3.3V or 5V (onboard regulator accepts 3.3V - 5V) |
| **NEO-6M GPS** | GND | GND | Common ground reference |
| **NEO-6M GPS** | TX | GPIO 16 (RX2) | Hardware Serial2 receives 9600-baud NMEA stream |
| **NEO-6M GPS** | RX | GPIO 17 (TX2) | Hardware Serial2 transmits configuration commands |
| **SOS Push Button** | Pin 1 | GPIO 4 | Configured with `INPUT_PULLUP` |
| **SOS Push Button** | Pin 2 | GND | Pressing button pulls GPIO 4 LOW |
| **Active Piezo Buzzer** | (+) Positive | GPIO 18 | Digital OUT drives alarm audio tones |
| **Active Piezo Buzzer** | (-) Negative | GND | Ground return |
| **Status LED** | Anode (+) | GPIO 2 | Built-in blue LED for Wi-Fi status |
| **Battery Voltage Divider** | Out | GPIO 34 (ADC1_6) | 100kΩ / 100kΩ divider from LiPo 3.7V (Max 2.1V input) |

---

## Operating Instructions & Field Limitations
- **Antenna Orientation:** The ceramic patch antenna of the NEO-6M must face upward toward the open sky.
- **Time To First Fix (TTFF):** Cold start takes 27–45 seconds under clear sky. The red PPS LED on the NEO-6M blinks at 1 Hz once a valid satellite lock is established.
- **Indoor Attenuation:** GPS satellite signals (~1.575 GHz) are heavily attenuated by reinforced concrete walls and multi-story roofs. When indoors, the tag transmits the last known valid coordinate and flags freshness.
- **Wi-Fi Range:** The tag connects to campus Wi-Fi or the guardian's mobile phone personal hotspot.
