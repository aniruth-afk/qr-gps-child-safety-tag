/**
 * @file esp32_child_safety_tag.ino
 * @brief Complete ESP32 + u-blox NEO-6M GPS Child Safety Tag Firmware
 * @author Student IoT Engineering Project
 * 
 * Hardware:
 *   - ESP32 Development Board (ESP-WROOM-32D)
 *   - u-blox NEO-6M GPS Module (with ceramic antenna)
 *   - Tactile Push Button (SOS trigger)
 *   - Active 5V Piezo Buzzer
 *   - 3.7V 1000mAh Li-Po Battery + TP4056 USB-C Charger
 *   - Printed Laminated QR Code ID Card (No electronic screen needed)
 * 
 * Required Arduino Libraries:
 *   - TinyGPSPlus (by Mikal Hart)
 *   - ArduinoJson (by Benoit Blanchon, v6.x or v7.x)
 *   - WiFi (Built-in ESP32 core)
 *   - HTTPClient (Built-in ESP32 core)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <HardwareSerial.h>
#include <TinyGPSPlus.h>
#include <ArduinoJson.h>

// ==============================================================================
// USER CONFIGURATION (Configure for your local access point or mobile hotspot)
// ==============================================================================
const char* WIFI_SSID     = "Mobile_Hotspot_2.4G";
const char* WIFI_PASSWORD = "student_project_wifi";

// Server API Base URL
// Replace with your hosted Flask server URL or local dev tunnel (e.g., ngrok or LAN IP)
const char* SERVER_LOCATION_ENDPOINT = "http://192.168.4.1:5000/api/devices/location";
const char* SERVER_SOS_ENDPOINT      = "http://192.168.4.1:5000/api/devices/sos";

// Tag Hardware Identifier (Matches Child Profile Device ID)
const char* DEVICE_ID = "TAG001";

// Pinout Definitions (ESP32 DevKit 30-pin)
const int PIN_GPS_RX        = 16;  // Connects to NEO-6M TX
const int PIN_GPS_TX        = 17;  // Connects to NEO-6M RX
const int PIN_SOS_BUTTON    = 4;   // Push button (to GND, internal pullup)
const int PIN_BUZZER        = 18;  // Piezo Buzzer (+)
const int PIN_STATUS_LED    = 2;   // Onboard Blue LED
const int PIN_BATTERY_ADC   = 34;  // Voltage divider (100k/100k) from LiPo 3.7V

// Timing Constants
const unsigned long LOCATION_INTERVAL_MS = 15000; // Transmit GPS every 15 seconds
const unsigned long SOS_HOLD_DURATION_MS = 2000;  // Hold button 2s to prevent false alarms

// Globals
TinyGPSPlus gps;
HardwareSerial gpsSerial(2);

unsigned long lastLocationPostTime = 0;
unsigned long buttonDownStartTime  = 0;
bool sosTriggeredForCurrentPress   = false;

// ==============================================================================
// FUNCTION DECLARATIONS
// ==============================================================================
void setupHardwarePins();
void connectToWiFi();
void checkPhysicalSosButton();
void processPeriodicGpsTransmission();
void sendLocationPacket(double lat, double lng, float hdop, int satellites, int batteryPct);
void sendSosPacket(double lat, double lng);
void triggerBuzzerAlarm();
int readBatteryPercentage();

// ==============================================================================
// SETUP
// ==============================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n========================================================");
  Serial.println("  QR-GPS CHILD SAFETY TAG - ESP32 FIRMWARE v1.4.2");
  Serial.println("  Hardware: ESP32 + NEO-6M + SOS Tactile Button");
  Serial.println("========================================================\n");

  setupHardwarePins();

  // Initialize GPS UART on Serial2 (GPIO 16 RX, GPIO 17 TX)
  gpsSerial.begin(9600, SERIAL_8N1, PIN_GPS_RX, PIN_GPS_TX);
  Serial.println("[GPS] UART2 opened at 9600 baud for NEO-6M NMEA stream.");

  connectToWiFi();
}

// ==============================================================================
// MAIN LOOP
// ==============================================================================
void loop() {
  // Feed incoming GPS NMEA bytes from NEO-6M into parser
  while (gpsSerial.available() > 0) {
    char c = gpsSerial.read();
    gps.encode(c);
  }

  // 1. Process physical tactile SOS button
  checkPhysicalSosButton();

  // 2. Transmit periodic GPS coordinates
  processPeriodicGpsTransmission();
}

// ==============================================================================
// HARDWARE INITIALIZATION
// ==============================================================================
void setupHardwarePins() {
  pinMode(PIN_SOS_BUTTON, INPUT_PULLUP);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_STATUS_LED, OUTPUT);

  digitalWrite(PIN_BUZZER, LOW);
  digitalWrite(PIN_STATUS_LED, LOW);
}

// ==============================================================================
// WI-FI CONNECTION WITH RECONNECT RETRY
// ==============================================================================
void connectToWiFi() {
  Serial.printf("[WIFI] Connecting to SSID: '%s'...\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(400);
    digitalWrite(PIN_STATUS_LED, !digitalRead(PIN_STATUS_LED)); // Toggle LED while connecting
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(PIN_STATUS_LED, HIGH);
    Serial.printf("\n[WIFI] Connected! Assigned IP: %s (RSSI: %d dBm)\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI());
  } else {
    digitalWrite(PIN_STATUS_LED, LOW);
    Serial.println("\n[WIFI] Could not connect to Wi-Fi. Will retry automatically.");
  }
}

// ==============================================================================
// PHYSICAL SOS BUTTON MONITORING (DEBOUNCED)
// ==============================================================================
void checkPhysicalSosButton() {
  int buttonState = digitalRead(PIN_SOS_BUTTON);

  // Button pressed pulls pin LOW to GND
  if (buttonState == LOW) {
    if (buttonDownStartTime == 0) {
      buttonDownStartTime = millis();
    } else if ((millis() - buttonDownStartTime >= SOS_HOLD_DURATION_MS) && !sosTriggeredForCurrentPress) {
      Serial.println("\n🚨 [EMERGENCY] Physical SOS tactile button held down for 2 seconds!");
      sosTriggeredForCurrentPress = true;
      triggerBuzzerAlarm();

      double lat = gps.location.isValid() ? gps.location.lat() : 9.92750;
      double lng = gps.location.isValid() ? gps.location.lng() : 78.12240;
      sendSosPacket(lat, lng);
    }
  } else {
    // Reset when released
    buttonDownStartTime = 0;
    sosTriggeredForCurrentPress = false;
  }
}

// ==============================================================================
// PERIODIC LOCATION POSTING
// ==============================================================================
void processPeriodicGpsTransmission() {
  if (millis() - lastLocationPostTime >= LOCATION_INTERVAL_MS) {
    lastLocationPostTime = millis();

    // Check Wi-Fi state
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("[WIFI] Connection dropped. Re-establishing link...");
      WiFi.reconnect();
      return;
    }

    if (gps.location.isValid()) {
      double lat = gps.location.lat();
      double lng = gps.location.lng();
      float hdop = gps.hdop.isValid() ? gps.hdop.hdop() * 3.5 : 8.0;
      int sats   = gps.satellites.isValid() ? gps.satellites.value() : 0;
      int batt   = readBatteryPercentage();

      Serial.printf("[GPS] Fix Valid -> Lat: %.6f, Lng: %.6f, HDOP: %.1f, Sats: %d, Batt: %d%%\n",
                    lat, lng, hdop, sats, batt);
      sendLocationPacket(lat, lng, hdop, sats, batt);
    } else {
      Serial.printf("[GPS] Searching for satellites... (Chars processed: %d, Check sky view)\n",
                    gps.charsProcessed());
    }
  }
}

// ==============================================================================
// HTTP TRANSMISSIONS (JSON REST API)
// ==============================================================================
void sendLocationPacket(double lat, double lng, float accuracy, int satellites, int batteryPct) {
  HTTPClient http;
  http.begin(SERVER_LOCATION_ENDPOINT);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<256> doc;
  doc["device_id"]      = DEVICE_ID;
  doc["latitude"]       = lat;
  doc["longitude"]      = lng;
  doc["accuracy"]       = accuracy;
  doc["batteryPercent"] = batteryPct;
  doc["satellites"]     = satellites;

  String jsonString;
  serializeJson(doc, jsonString);

  int httpCode = http.POST(jsonString);
  if (httpCode > 0) {
    Serial.printf("[HTTP] POST /api/devices/location -> Status: %d\n", httpCode);
  } else {
    Serial.printf("[HTTP] POST failed, error: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}

void sendSosPacket(double lat, double lng) {
  HTTPClient http;
  http.begin(SERVER_SOS_ENDPOINT);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  doc["latitude"]  = lat;
  doc["longitude"] = lng;
  doc["trigger"]   = "physical_button";
  doc["notes"]     = "Hardware tactile push button held for 2s on tag.";

  String jsonString;
  serializeJson(doc, jsonString);

  int httpCode = http.POST(jsonString);
  Serial.printf("[HTTP] Emergency SOS POST dispatched -> Status: %d\n", httpCode);
  http.end();
}

// ==============================================================================
// PERIPHERALS: BUZZER & BATTERY ADC
// ==============================================================================
void triggerBuzzerAlarm() {
  for (int i = 0; i < 4; i++) {
    digitalWrite(PIN_BUZZER, HIGH);
    digitalWrite(PIN_STATUS_LED, HIGH);
    delay(180);
    digitalWrite(PIN_BUZZER, LOW);
    digitalWrite(PIN_STATUS_LED, LOW);
    delay(100);
  }
}

int readBatteryPercentage() {
  int rawAdc = analogRead(PIN_BATTERY_ADC);
  // 12-bit ADC (0..4095) with 1:1 voltage divider (100k/100k) from LiPo
  float voltage = (rawAdc / 4095.0) * 3.3 * 2.0;
  int pct = (int)(((voltage - 3.2) / (4.2 - 3.2)) * 100.0);
  return constrain(pct, 0, 100);
}
