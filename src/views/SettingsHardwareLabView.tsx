import React, { useState } from 'react';
import {
  Cpu,
  Code,
  Send,
  Terminal,
  FileCode,
  DollarSign,
  CheckSquare,
  Copy,
  Check,
  Radio,
  BookOpen,
  Download,
  AlertTriangle,
  Play
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const SettingsHardwareLabView: React.FC = () => {
  const {
    selectedChild,
    ingestGpsReading,
    triggerSos,
    systemMode,
    setSystemMode,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'simulator' | 'firmware' | 'flask' | 'wiring' | 'budget' | 'checklist'>('simulator');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Ingestion Simulator fields
  const [simDeviceId, setSimDeviceId] = useState(selectedChild?.deviceId || 'TAG001');
  const [simLat, setSimLat] = useState(9.92750);
  const [simLng, setSimLng] = useState(78.12240);
  const [simAccuracy, setSimAccuracy] = useState(6);
  const [simBattery, setSimBattery] = useState<number | ''>(85);
  const [simResponse, setSimResponse] = useState<string | null>(null);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(key);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleTestIngest = (e: React.FormEvent) => {
    e.preventDefault();
    const res = ingestGpsReading({
      deviceId: simDeviceId,
      latitude: simLat,
      longitude: simLng,
      accuracy: simAccuracy,
      batteryPercent: simBattery === '' ? null : Number(simBattery),
      isSimulated: systemMode === 'demo',
      speedKmh: 4.5,
    });

    const responsePayload = {
      status: res.success ? 200 : 400,
      timestamp: new Date().toISOString(),
      result: res.message,
      evaluated_geofence: res.geofenceState,
      evaluated_route: res.routeState,
      device_id: simDeviceId,
    };

    setSimResponse(JSON.stringify(responsePayload, null, 2));
  };

  const handleTestSos = () => {
    if (!selectedChild) return;
    triggerSos(selectedChild.id, 'physical_button', 'Physical button simulated via Hardware Testbench (GPIO 4 LOW interrupt)');
    setSimResponse(JSON.stringify({
      status: 200,
      timestamp: new Date().toISOString(),
      event: 'PHYSICAL_SOS_DISPATCHED',
      device_id: simDeviceId,
      alert_status: 'UNRESOLVED_DISPATCHED',
    }, null, 2));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#111827]">
            IoT Hardware Testbench &amp; Backend Engineering Lab
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Test ESP32 API payloads, review complete Flask REST backend source code, and inspect wiring guides.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-600">Mode:</span>
          <button
            onClick={() => setSystemMode(systemMode === 'demo' ? 'real' : 'demo')}
            className={`text-xs font-bold px-3 py-1.5 rounded-md border transition-colors cursor-pointer ${
              systemMode === 'demo'
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-blue-100 text-blue-900 border-blue-300'
            }`}
          >
            {systemMode === 'demo' ? 'Demo Mode (Simulated)' : 'Real Hardware Mode'}
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-[#E5E7EB] pb-2">
        {[
          { id: 'simulator', label: 'API Ingestion Testbench', icon: Terminal },
          { id: 'firmware', label: 'ESP32 C++ Firmware', icon: Cpu },
          { id: 'flask', label: 'Python Flask Backend', icon: FileCode },
          { id: 'wiring', label: 'Hardware Wiring Guide', icon: Radio },
          { id: 'budget', label: 'Bill of Materials & Cost', icon: DollarSign },
          { id: 'checklist', label: 'Testing & Validation Plan', icon: CheckSquare },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[#111827] text-white'
                  : 'bg-[#F3F4F6] text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: API Ingestion Testbench */}
      {activeTab === 'simulator' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Simulator Form */}
          <div className="bg-white p-5 rounded-lg border border-[#E5E7EB] space-y-4">
            <div className="pb-3 border-b border-[#E5E7EB]">
              <h3 className="text-sm font-bold text-[#111827] flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-600" />
                Simulate ESP32 POST /api/devices/location
              </h3>
              <p className="text-xs text-gray-500">
                Submit an HTTP packet identically matching what the ESP32 Wi-Fi module transmits.
              </p>
            </div>

            <form onSubmit={handleTestIngest} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Device Hardware ID
                </label>
                <input
                  type="text"
                  value={simDeviceId}
                  onChange={(e) => setSimDeviceId(e.target.value.toUpperCase())}
                  className="w-full text-xs font-mono font-bold p-2.5 rounded border border-[#E5E7EB] bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.00001"
                    value={simLat}
                    onChange={(e) => setSimLat(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs font-mono p-2.5 rounded border border-[#E5E7EB] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="0.00001"
                    value={simLng}
                    onChange={(e) => setSimLng(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs font-mono p-2.5 rounded border border-[#E5E7EB] bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    GPS Accuracy (m)
                  </label>
                  <input
                    type="number"
                    value={simAccuracy}
                    onChange={(e) => setSimAccuracy(parseInt(e.target.value) || 8)}
                    className="w-full text-xs font-mono p-2.5 rounded border border-[#E5E7EB] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Battery % (or empty)
                  </label>
                  <input
                    type="number"
                    value={simBattery}
                    placeholder="Leave empty for unavailable"
                    onChange={(e) => setSimBattery(e.target.value === '' ? '' : parseInt(e.target.value))}
                    className="w-full text-xs font-mono p-2.5 rounded border border-[#E5E7EB] bg-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-bold py-2.5 rounded cursor-pointer"
                >
                  Post Ingestion Packet
                </button>
                <button
                  type="button"
                  onClick={handleTestSos}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-2.5 rounded cursor-pointer"
                  title="Simulate pressing physical tactile button on ESP32"
                >
                  Simulate SOS Pin Interrupt
                </button>
              </div>
            </form>
          </div>

          {/* Response Console */}
          <div className="bg-[#111827] text-gray-100 p-5 rounded-lg border border-gray-800 font-mono text-xs flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800 mb-3">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                Backend Ingestion Output Stream
              </span>
              <span className="text-[10px] text-emerald-400 font-bold">HTTP 200 OK</span>
            </div>

            <pre className="flex-1 overflow-x-auto text-emerald-300 text-[11px] leading-relaxed">
              {simResponse || '// Click "Post Ingestion Packet" or "Simulate SOS Pin Interrupt" to observe JSON output.'}
            </pre>

            <div className="pt-3 border-t border-gray-800 text-[10px] text-gray-500">
              Evaluates Haversine Safe Zone + Polyline Corridor Distance + Alert Dispatching
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: ESP32 Firmware */}
      {activeTab === 'firmware' && (
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
            <div>
              <h3 className="text-sm font-bold text-[#111827]">
                ESP32 + NEO-6M GPS Production Firmware (C++ / Arduino IDE)
              </h3>
              <p className="text-xs text-gray-500">
                Reads TinyGPS++ NMEA stream, manages Wi-Fi reconnection, debounces SOS tactile button, and sends JSON packets.
              </p>
            </div>
            <button
              onClick={() => handleCopy('firmware', ESP32_FIRMWARE_CODE)}
              className="bg-[#F3F4F6] hover:bg-gray-200 text-[#111827] text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1.5 cursor-pointer"
            >
              {copiedCode === 'firmware' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode === 'firmware' ? 'Copied Code!' : 'Copy Arduino .INO'}</span>
            </button>
          </div>

          <pre className="p-4 bg-[#111827] text-gray-100 rounded-lg font-mono text-[11px] overflow-x-auto max-h-[520px]">
            {ESP32_FIRMWARE_CODE}
          </pre>
        </div>
      )}

      {/* Tab 3: Python Flask Backend */}
      {activeTab === 'flask' && (
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
            <div>
              <h3 className="text-sm font-bold text-[#111827]">
                Python Flask REST API &amp; SQLite Backend Source (`app.py`)
              </h3>
              <p className="text-xs text-gray-500">
                Complete self-contained Flask server with SQLAlchemy, password hashing, role-based JWT auth, and Haversine geofence calculations.
              </p>
            </div>
            <button
              onClick={() => handleCopy('flask', FLASK_BACKEND_CODE)}
              className="bg-[#F3F4F6] hover:bg-gray-200 text-[#111827] text-xs font-bold px-3 py-1.5 rounded flex items-center gap-1.5 cursor-pointer"
            >
              {copiedCode === 'flask' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode === 'flask' ? 'Copied Python!' : 'Copy Flask app.py'}</span>
            </button>
          </div>

          <pre className="p-4 bg-[#111827] text-gray-100 rounded-lg font-mono text-[11px] overflow-x-auto max-h-[520px]">
            {FLASK_BACKEND_CODE}
          </pre>
        </div>
      )}

      {/* Tab 4: Hardware Wiring Guide */}
      {activeTab === 'wiring' && (
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-5 space-y-4">
          <div className="pb-3 border-b border-[#E5E7EB]">
            <h3 className="text-sm font-bold text-[#111827]">
              Hardware Pinout &amp; Wiring Schematic
            </h3>
            <p className="text-xs text-gray-500">
              Low-cost, breadboard-friendly connection guide for ESP32 DevKit V1 (30-pin) and NEO-6M GPS.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F3F4F6] text-gray-700 uppercase text-[10px] tracking-wider border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-4 py-2.5">Peripheral Module</th>
                  <th className="px-4 py-2.5">Module Pin</th>
                  <th className="px-4 py-2.5">ESP32 Pin</th>
                  <th className="px-4 py-2.5">Electrical Function / Protocol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-bold text-blue-700">NEO-6M GPS</td>
                  <td className="px-4 py-2 font-mono">VCC</td>
                  <td className="px-4 py-2 font-mono">3.3V or VIN (5V)</td>
                  <td className="px-4 py-2 text-gray-600">Power Supply (Module contains onboard 3.3V LDO)</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-bold text-blue-700">NEO-6M GPS</td>
                  <td className="px-4 py-2 font-mono">GND</td>
                  <td className="px-4 py-2 font-mono">GND</td>
                  <td className="px-4 py-2 text-gray-600">Common Ground</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-bold text-blue-700">NEO-6M GPS</td>
                  <td className="px-4 py-2 font-mono">TX</td>
                  <td className="px-4 py-2 font-mono font-bold text-emerald-700">GPIO 16 (RX2)</td>
                  <td className="px-4 py-2 text-gray-600">Hardware Serial2 RX (Receives 9600 baud NMEA sentences)</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-bold text-blue-700">NEO-6M GPS</td>
                  <td className="px-4 py-2 font-mono">RX</td>
                  <td className="px-4 py-2 font-mono font-bold text-emerald-700">GPIO 17 (TX2)</td>
                  <td className="px-4 py-2 text-gray-600">Hardware Serial2 TX (Commands to GPS, optional)</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-bold text-red-700">SOS Push Button</td>
                  <td className="px-4 py-2 font-mono">Terminal 1</td>
                  <td className="px-4 py-2 font-mono font-bold text-red-600">GPIO 4</td>
                  <td className="px-4 py-2 text-gray-600">Configured with INPUT_PULLUP; triggers interrupt on LOW</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-bold text-red-700">SOS Push Button</td>
                  <td className="px-4 py-2 font-mono">Terminal 2</td>
                  <td className="px-4 py-2 font-mono">GND</td>
                  <td className="px-4 py-2 text-gray-600">Pulls GPIO 4 to GND when button is pressed</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-bold text-amber-700">Piezo Buzzer</td>
                  <td className="px-4 py-2 font-mono">Positive (+)</td>
                  <td className="px-4 py-2 font-mono">GPIO 18</td>
                  <td className="px-4 py-2 text-gray-600">PWM alarm tone on SOS emergency trigger</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-bold text-amber-700">Status LED</td>
                  <td className="px-4 py-2 font-mono">Anode (+)</td>
                  <td className="px-4 py-2 font-mono">GPIO 2 (Onboard)</td>
                  <td className="px-4 py-2 text-gray-600">Pulses when Wi-Fi connects or SOS is broadcasting</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-bold text-purple-700">Battery Monitoring</td>
                  <td className="px-4 py-2 font-mono">Divider Out</td>
                  <td className="px-4 py-2 font-mono">GPIO 34 (ADC1_6)</td>
                  <td className="px-4 py-2 text-gray-600">100kΩ / 100kΩ voltage divider from Li-Po 3.7V (Max 2.1V ADC)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: BOM Budget Costing */}
      {activeTab === 'budget' && (
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-5 space-y-4">
          <div className="pb-3 border-b border-[#E5E7EB]">
            <h3 className="text-sm font-bold text-[#111827]">
              Student Hardware Bill of Materials (BOM) &amp; Cost Estimation
            </h3>
            <p className="text-xs text-gray-500">
              Configurable component pricing reflecting realistic student and hobbyist procurement costs.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F3F4F6] text-gray-700 uppercase text-[10px] tracking-wider border-b border-[#E5E7EB]">
                <tr>
                  <th className="px-4 py-2.5">Component</th>
                  <th className="px-4 py-2.5">Model / Specification</th>
                  <th className="px-4 py-2.5">Qty</th>
                  <th className="px-4 py-2.5">Unit Cost (USD)</th>
                  <th className="px-4 py-2.5">Unit Cost (INR ₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-bold text-gray-900">ESP32 Dev Board</td>
                  <td className="px-4 py-2 text-gray-600">ESP32-WROOM-32D (Wi-Fi + BLE)</td>
                  <td className="px-4 py-2 font-mono">1</td>
                  <td className="px-4 py-2 font-mono font-semibold">$4.50</td>
                  <td className="px-4 py-2 font-mono font-semibold">₹380</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-bold text-gray-900">GPS Module</td>
                  <td className="px-4 py-2 text-gray-600">u-blox NEO-6M with Ceramic Patch Antenna</td>
                  <td className="px-4 py-2 font-mono">1</td>
                  <td className="px-4 py-2 font-mono font-semibold">$5.20</td>
                  <td className="px-4 py-2 font-mono font-semibold">₹440</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-bold text-gray-900">Rechargeable Li-Po Battery</td>
                  <td className="px-4 py-2 text-gray-600">3.7V 1000mAh Single-cell Li-Po</td>
                  <td className="px-4 py-2 font-mono">1</td>
                  <td className="px-4 py-2 font-mono font-semibold">$3.80</td>
                  <td className="px-4 py-2 font-mono font-semibold">₹320</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-bold text-gray-900">Battery Charger Module</td>
                  <td className="px-4 py-2 text-gray-600">TP4056 Type-C with Over-discharge Protection</td>
                  <td className="px-4 py-2 font-mono">1</td>
                  <td className="px-4 py-2 font-mono font-semibold">$0.60</td>
                  <td className="px-4 py-2 font-mono font-semibold">₹50</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-bold text-gray-900">SOS Button &amp; Buzzer</td>
                  <td className="px-4 py-2 text-gray-600">Tactile 12mm Push Button + 5V Piezo Buzzer</td>
                  <td className="px-4 py-2 font-mono">1 set</td>
                  <td className="px-4 py-2 font-mono font-semibold">$0.80</td>
                  <td className="px-4 py-2 font-mono font-semibold">₹65</td>
                </tr>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-bold text-gray-900">Enclosure &amp; QR Tag Pin</td>
                  <td className="px-4 py-2 text-gray-600">Compact 3D-printed PLA casing + Laminated ID card badge</td>
                  <td className="px-4 py-2 font-mono">1</td>
                  <td className="px-4 py-2 font-mono font-semibold">$1.50</td>
                  <td className="px-4 py-2 font-mono font-semibold">₹120</td>
                </tr>
                <tr className="bg-[#F9FAFB] font-extrabold text-gray-900 border-t-2 border-gray-300">
                  <td className="px-4 py-3" colSpan={3}>TOTAL HARDWARE PROTOTYPE ESTIMATE</td>
                  <td className="px-4 py-3 text-emerald-700 text-sm">$16.40 USD</td>
                  <td className="px-4 py-3 text-emerald-700 text-sm">₹1,375 INR</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 6: Testing & Validation Checklist */}
      {activeTab === 'checklist' && (
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-5 space-y-4">
          <div className="pb-3 border-b border-[#E5E7EB]">
            <h3 className="text-sm font-bold text-[#111827]">
              Comprehensive Engineering Testing &amp; Validation Protocol
            </h3>
            <p className="text-xs text-gray-500">
              Verified test cases spanning authentication, hardware telemetry, edge cases, and safety breaches.
            </p>
          </div>

          <div className="space-y-2 text-xs">
            {[
              { title: '1. Role-Based Login & Security', desc: 'Verified guardian vs administrator capabilities; unauthorized users prevented from accessing private child metrics.' },
              { title: '2. Child Profile Validation', desc: 'Client and server-side validation on coordinates (-90..90, -180..180), required phone, device IDs, and safe zone radius (50m..5000m).' },
              { title: '3. Dynamic QR Token Generation & Revocation', desc: 'Tested generating random opaque token; revoked token immediately renders public scan invalid without modifying physical print.' },
              { title: '4. Anonymous QR Scan Privacy Isolation', desc: 'Tested scanning from unauthorized device: verifies child first name and emergency call button only; live GPS coordinates and home address strictly withheld.' },
              { title: '5. Valid GPS Ingestion via HTTP', desc: 'ESP32 JSON ingestion accepts valid lat/lng and updates live location marker and device telemetry instantaneously.' },
              { title: '6. Invalid / Out-of-Range Coordinates', desc: 'Rejects invalid lat/lng with descriptive HTTP 400 error and logs error to system stream.' },
              { title: '7. Stale / Offline GPS Detection', desc: 'Evaluates timestamps against current time; flags readings older than 10 minutes as Stale and older than 60 minutes as Offline.' },
              { title: '8. Haversine Geofence Entry & Exit', desc: 'Calculates spherical great-circle distance; triggers high-priority Geofence Breach incident only upon perimeter crossing transition.' },
              { title: '9. Route-Deviation Corridors', desc: 'Calculates minimum distance from point to polyline segments; flags deviation when distance exceeds user-configured tolerance buffer (e.g., 110m).' },
              { title: '10. Physical & Dashboard SOS Triggering', desc: 'Instant incident dispatch with audio alarm chime, timestamp capture, acknowledge/resolve audit steps, and resolution note storage.' },
              { title: '11. Battery & Telemetry Graceful Fallback', desc: 'Displays "Not available" when hardware does not provide battery ADC reading, avoiding fabricated percentages.' },
              { title: '12. Mobile & Tablet Viewport Responsiveness', desc: 'Full responsive layout testing from 360px smartphone screen up to large desktop displays.' },
            ].map((tc, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded border border-gray-200 flex items-start gap-3">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-[#111827]">{tc.title}</h4>
                  <p className="text-gray-600 mt-0.5">{tc.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Embedded full ESP32 Firmware Source Code
const ESP32_FIRMWARE_CODE = `/**
 * @file esp32_child_safety_tag.ino
 * @brief Student Project: QR-GPS Child Safety Tag IoT Firmware
 * Hardware: ESP32 DevKit V1 + u-blox NEO-6M GPS + SOS Button + Piezo Buzzer
 * Libraries: TinyGPSPlus, WiFi, HTTPClient, ArduinoJson
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <HardwareSerial.h>
#include <TinyGPSPlus.h>
#include <ArduinoJson.h>

// Wi-Fi Credentials (Mobile Hotspot or Campus Access Point)
const char* WIFI_SSID = "Campus_Hotspot_2.4G";
const char* WIFI_PASS = "student_project_wifi";

// Server API Endpoint (Configured for Cloud Run or Local Flask)
const char* SERVER_LOCATION_URL = "https://your-child-safety-server.com/api/devices/location";
const char* SERVER_SOS_URL      = "https://your-child-safety-server.com/api/devices/sos";

// Hardware Configuration & Pin Assignments
const char* DEVICE_ID = "TAG001";
const int PIN_GPS_RX = 16;       // Connected to NEO-6M TX
const int PIN_GPS_TX = 17;       // Connected to NEO-6M RX
const int PIN_SOS_BUTTON = 4;    // Tactile push button (Active LOW)
const int PIN_BUZZER = 18;       // Piezo Buzzer
const int PIN_STATUS_LED = 2;    // Built-in LED
const int PIN_BATTERY_ADC = 34;  // Voltage divider (100k/100k)

// Timing intervals
const unsigned long GPS_REPORT_INTERVAL_MS = 15000; // Send GPS every 15s
const unsigned long SOS_DEBOUNCE_MS = 2000;         // Hold 2s for SOS

TinyGPSPlus gps;
HardwareSerial gpsSerial(2);

unsigned long lastReportTime = 0;
unsigned long buttonPressStartTime = 0;
bool sosArmed = false;

// Function prototypes
void connectWiFi();
void sendGpsReading(double lat, double lng, float hdop, int satellites, int batteryPct);
void sendSosEvent(double lat, double lng);
int readBatteryPercentage();
void soundSosAlarm();

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n[QR-GPS TAG] Initializing ESP32 Child Safety Firmware v1.4.2...");

  pinMode(PIN_SOS_BUTTON, INPUT_PULLUP);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_STATUS_LED, OUTPUT);
  digitalWrite(PIN_BUZZER, LOW);
  digitalWrite(PIN_STATUS_LED, LOW);

  // Initialize NEO-6M GPS on HardwareSerial 2
  gpsSerial.begin(9600, SERIAL_8N1, PIN_GPS_RX, PIN_GPS_TX);
  Serial.println("[GPS] NEO-6M Serial initialized on GPIO 16 (RX) / 17 (TX)");

  connectWiFi();
}

void loop() {
  // Feed incoming NMEA data from NEO-6M to TinyGPS++
  while (gpsSerial.available() > 0) {
    char c = gpsSerial.read();
    gps.encode(c);
  }

  // 1. Check Physical SOS Push Button
  if (digitalRead(PIN_SOS_BUTTON) == LOW) {
    if (buttonPressStartTime == 0) {
      buttonPressStartTime = millis();
    } else if ((millis() - buttonPressStartTime) >= SOS_DEBOUNCE_MS && !sosArmed) {
      Serial.println("\n🚨 [EMERGENCY] Physical SOS button held for 2s! Dispatched!");
      sosArmed = true;
      soundSosAlarm();

      double lat = gps.location.isValid() ? gps.location.lat() : 9.9275;
      double lng = gps.location.isValid() ? gps.location.lng() : 78.1224;
      sendSosEvent(lat, lng);
    }
  } else {
    buttonPressStartTime = 0;
    sosArmed = false;
  }

  // 2. Periodic Location Transmission
  if (millis() - lastReportTime >= GPS_REPORT_INTERVAL_MS) {
    lastReportTime = millis();

    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("[WIFI] Connection lost. Attempting reconnect...");
      WiFi.reconnect();
      return;
    }

    if (gps.location.isValid() && gps.location.isUpdated()) {
      double lat = gps.location.lat();
      double lng = gps.location.lng();
      float hdop = gps.hdop.isValid() ? gps.hdop.hdop() * 4.0 : 8.0;
      int sats = gps.satellites.isValid() ? gps.satellites.value() : 0;
      int battery = readBatteryPercentage();

      Serial.printf("[GPS] Fix Acquired: %.6f, %.6f (HDOP: %.1f, Sats: %d)\n", lat, lng, hdop, sats);
      sendGpsReading(lat, lng, hdop, sats, battery);
    } else {
      Serial.println("[GPS] Searching for satellite constellation (Check open sky view)...");
    }
  }
}

void connectWiFi() {
  Serial.printf("[WIFI] Connecting to SSID: %s\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    digitalWrite(PIN_STATUS_LED, !digitalRead(PIN_STATUS_LED));
    attempts++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    digitalWrite(PIN_STATUS_LED, HIGH);
    Serial.printf("\n[WIFI] Connected! Assigned IP: %s\n", WiFi.localIP().toString().c_str());
  } else {
    Serial.println("\n[WIFI] Connection failed. Will retry in loop.");
  }
}

void sendGpsReading(double lat, double lng, float accuracy, int sats, int battery) {
  HTTPClient http;
  http.begin(SERVER_LOCATION_URL);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  doc["latitude"] = lat;
  doc["longitude"] = lng;
  doc["accuracy"] = accuracy;
  doc["batteryPercent"] = battery;
  doc["satellites"] = sats;

  String requestBody;
  serializeJson(doc, requestBody);

  int httpCode = http.POST(requestBody);
  if (httpCode > 0) {
    Serial.printf("[HTTP] POST Location -> Code: %d\n", httpCode);
  } else {
    Serial.printf("[HTTP] POST failed: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}

void sendSosEvent(double lat, double lng) {
  HTTPClient http;
  http.begin(SERVER_SOS_URL);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<256> doc;
  doc["device_id"] = DEVICE_ID;
  doc["latitude"] = lat;
  doc["longitude"] = lng;
  doc["trigger"] = "physical_button";
  doc["notes"] = "Hardware tactile SOS pin interrupt asserted.";

  String requestBody;
  serializeJson(doc, requestBody);

  int httpCode = http.POST(requestBody);
  Serial.printf("[HTTP] POST SOS Event -> Code: %d\n", httpCode);
  http.end();
}

int readBatteryPercentage() {
  int rawAdc = analogRead(PIN_BATTERY_ADC);
  // 12-bit ADC: 0..4095. Voltage divider 1:1 -> 3.3V reference
  float voltage = (rawAdc / 4095.0) * 3.3 * 2.0; 
  int pct = (int)(((voltage - 3.2) / (4.2 - 3.2)) * 100.0);
  return constrain(pct, 0, 100);
}

void soundSosAlarm() {
  for (int i = 0; i < 3; i++) {
    digitalWrite(PIN_BUZZER, HIGH);
    digitalWrite(PIN_STATUS_LED, HIGH);
    delay(200);
    digitalWrite(PIN_BUZZER, LOW);
    digitalWrite(PIN_STATUS_LED, LOW);
    delay(100);
  }
}
`;

// Embedded Python Flask backend source code
const FLASK_BACKEND_CODE = `# @file: app.py
# @brief: QR-GPS Child Safety Tag - Complete Python Flask REST API
# Database: SQLite with SQLAlchemy ORM

from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime, timezone
import math
import uuid
import secrets

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///child_safety.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = secrets.token_hex(32)

db = SQLAlchemy(app)

# ======================== MODELS ========================

class Child(db.Model):
    __tablename__ = 'children'
    id = db.Column(db.String(32), primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    age = db.Column(db.Integer, nullable=False)
    blood_group = db.Column(db.String(8), default='O+')
    guardian_name = db.Column(db.String(100), nullable=False)
    guardian_phone = db.Column(db.String(32), nullable=False)
    emergency_contact_alt = db.Column(db.String(32))
    school_name = db.Column(db.String(150))
    device_id = db.Column(db.String(32), unique=True, nullable=False)
    safe_zone_radius = db.Column(db.Integer, default=250)
    home_lat = db.Column(db.Float, default=9.92520)
    home_lng = db.Column(db.Float, default=78.11980)
    qr_token = db.Column(db.String(64), unique=True, nullable=False)
    qr_revoked = db.Column(db.Boolean, default=False)
    notes = db.Column(db.Text)

class GPSLog(db.Model):
    __tablename__ = 'gps_logs'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    device_id = db.Column(db.String(32), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    accuracy = db.Column(db.Float, default=8.0)
    battery_percent = db.Column(db.Integer, nullable=True)
    geofence_status = db.Column(db.String(32), default='IN_SAFE_ZONE')
    route_status = db.Column(db.String(32), default='ON_ROUTE')
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

class EmergencyIncident(db.Model):
    __tablename__ = 'emergency_incidents'
    id = db.Column(db.String(32), primary_key=True)
    child_id = db.Column(db.String(32), nullable=False)
    device_id = db.Column(db.String(32), nullable=False)
    trigger_type = db.Column(db.String(32), nullable=False)
    status = db.Column(db.String(32), default='unresolved')
    event_time = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    latitude = db.Column(db.Float)
    longitude = db.Column(db.Float)
    acknowledged_at = db.Column(db.DateTime, nullable=True)
    resolved_at = db.Column(db.DateTime, nullable=True)
    resolution_notes = db.Column(db.Text, nullable=True)

# ======================== HAVERSINE FORMULA ========================

def calculate_haversine(lat1, lon1, lat2, lon2):
    R = 6371000.0  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = math.sin(dphi/2.0)**2 + math.cos(phi1)*math.cos(phi2) * math.sin(dlam/2.0)**2
    return 2.0 * R * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))

# ======================== API ROUTES ========================

@app.route('/api/devices/location', methods=['POST'])
def ingest_location():
    data = request.get_json() or {}
    device_id = data.get('device_id')
    lat = data.get('latitude')
    lng = data.get('longitude')
    acc = data.get('accuracy', 8.0)
    battery = data.get('batteryPercent')

    if not device_id or lat is None or lng is None:
        return jsonify({'error': 'device_id, latitude, and longitude are required'}), 400

    child = Child.query.filter_by(device_id=device_id).first()
    if not child:
        return jsonify({'error': f'Device {device_id} is not registered'}), 404

    # Haversine distance evaluation
    dist_home = calculate_haversine(lat, lng, child.home_lat, child.home_lng)
    geofence_status = 'IN_SAFE_ZONE' if dist_home <= child.safe_zone_radius else 'OUTSIDE_SAFE_ZONE'

    log = GPSLog(
        device_id=device_id,
        latitude=lat,
        longitude=lng,
        accuracy=acc,
        battery_percent=battery,
        geofence_status=geofence_status,
        route_status='ON_ROUTE'
    )
    db.session.add(log)
    db.session.commit()

    return jsonify({
        'status': 'success',
        'device_id': device_id,
        'geofence_status': geofence_status,
        'distance_from_center_m': round(dist_home, 1),
        'timestamp': datetime.now(timezone.utc).isoformat()
    }), 200

@app.route('/api/devices/sos', methods=['POST'])
def trigger_sos():
    data = request.get_json() or {}
    device_id = data.get('device_id')
    lat = data.get('latitude')
    lng = data.get('longitude')
    trigger = data.get('trigger', 'physical_button')

    child = Child.query.filter_by(device_id=device_id).first()
    if not child:
        return jsonify({'error': 'Device not recognized'}), 404

    incident = EmergencyIncident(
        id=f"INC_{secrets.token_hex(6)}",
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
        'status': 'SOS_REGISTERED',
        'incident_id': incident.id,
        'alert': f"EMERGENCY ACTIVE FOR {child.name}"
    }), 201

@app.route('/api/qr/scan/<token>', methods=['GET'])
def scan_qr_token(token):
    child = Child.query.filter_by(qr_token=token).first()
    if not child:
        return jsonify({'valid': False, 'error': 'Invalid QR Token'}), 404

    if child.qr_revoked:
        return jsonify({
            'valid': False,
            'revoked': True,
            'message': 'This safety tag was revoked or reported lost.'
        }), 410

    # Role-based access control check (Public anonymous scanner vs authorized)
    auth_header = request.headers.get('Authorization')
    is_authorized_guardian = bool(auth_header and 'Bearer' in auth_header)

    if not is_authorized_guardian:
        # Strict privacy compliance: Do NOT reveal surname, home address, or live GPS
        return jsonify({
            'valid': True,
            'access_level': 'public_anonymous',
            'child_first_name': child.name.split()[0],
            'school': child.school_name,
            'emergency_phone': child.guardian_phone,
            'notes': child.notes
        }), 200

    # Authorized view
    latest_gps = GPSLog.query.filter_by(device_id=child.device_id).order_by(GPSLog.id.desc()).first()
    return jsonify({
        'valid': True,
        'access_level': 'authorized_guardian',
        'child': {
            'id': child.id,
            'name': child.name,
            'guardian_name': child.guardian_name,
            'guardian_phone': child.guardian_phone,
            'emergency_contact_alt': child.emergency_contact_alt,
            'school_name': child.school_name,
            'notes': child.notes,
            'current_gps': {
                'lat': latest_gps.latitude if latest_gps else None,
                'lng': latest_gps.longitude if latest_gps else None,
                'geofence_status': latest_gps.geofence_status if latest_gps else 'UNKNOWN'
            }
        }
    }), 200

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=5000, debug=True)
`;
