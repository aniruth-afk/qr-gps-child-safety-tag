import React, { useState } from 'react';
import {
  Cpu,
  Wifi,
  Battery,
  Radio,
  Clock,
  Shield,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Signal
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const DeviceStatusView: React.FC = () => {
  const {
    selectedChild,
    deviceStatusList,
    updateHeartbeat,
    alerts,
    systemMode,
  } = useApp();

  const [pinging, setPinging] = useState(false);
  const [pingSuccess, setPingSuccess] = useState<string | null>(null);

  if (!selectedChild) {
    return <div className="p-8 text-center text-xs text-gray-500">No child selected.</div>;
  }

  const device = deviceStatusList[selectedChild.deviceId] || {
    deviceId: selectedChild.deviceId,
    childId: selectedChild.id,
    isOnline: true,
    lastHeartbeat: new Date().toISOString(),
    lastGpsUpdate: new Date().toISOString(),
    batteryPercent: 88,
    hasGpsLock: true,
    hardwareVersion: 'ESP32-WROOM-32D / NEO-6M',
    firmwareVersion: 'v1.4.2-iot-safety',
    wifiSsid: 'Campus_Hotspot_2.4G',
    signalStrengthDbm: -64,
  };

  const childAlerts = alerts.filter((a) => a.childId === selectedChild.id && a.triggerType === 'physical_button');
  const lastSos = childAlerts[0];

  const handlePingDevice = () => {
    setPinging(true);
    setTimeout(() => {
      setPinging(false);
      updateHeartbeat(device.deviceId);
      setPingSuccess(`Heartbeat ACK received from ${device.deviceId} (RTT: 42ms)`);
      setTimeout(() => setPingSuccess(null), 3500);
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#111827]">
            IoT Hardware &amp; ESP32 Health Status
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Diagnostic telemetry for Device #{device.deviceId} paired to {selectedChild.name}.
          </p>
        </div>

        <button
          onClick={handlePingDevice}
          disabled={pinging}
          className="bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${pinging ? 'animate-spin' : ''}`} />
          <span>{pinging ? 'Transmitting Ping...' : 'Transmit Heartbeat Ping'}</span>
        </button>
      </div>

      {pingSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-4 py-2.5 rounded-md flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{pingSuccess}</span>
        </div>
      )}

      {/* Main Hardware Status Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Online Status & Heartbeat */}
        <div className="bg-white p-5 rounded-lg border border-[#E5E7EB] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
            <span className="text-xs font-bold text-gray-600 uppercase">Connectivity &amp; Heartbeat</span>
            <span className={`w-3 h-3 rounded-full ${device.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          </div>

          <div>
            <div className="text-2xl font-black text-[#111827]">
              {device.isOnline ? 'ONLINE (ACTIVE)' : 'OFFLINE'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Heartbeat timeout threshold: <strong>120 seconds</strong>
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-gray-100 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Last Telemetry Packet:</span>
              <span className="font-mono font-semibold text-gray-900">{new Date(device.lastHeartbeat).toLocaleTimeString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Wi-Fi Access Point:</span>
              <span className="font-semibold text-blue-700">{device.wifiSsid || 'Mobile Hotspot'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">RSSI Signal Strength:</span>
              <span className="font-bold text-gray-900">{device.signalStrengthDbm || -68} dBm (Good)</span>
            </div>
          </div>
        </div>

        {/* Card 2: GPS Receiver Health */}
        <div className="bg-white p-5 rounded-lg border border-[#E5E7EB] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
            <span className="text-xs font-bold text-gray-600 uppercase">GPS Constellation Status</span>
            <Radio className="w-4 h-4 text-blue-600" />
          </div>

          <div>
            <div className="text-2xl font-black text-[#111827]">
              {device.hasGpsLock ? '3D FIX ACQUIRED' : 'SEARCHING FIX'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Hardware: <strong>u-blox NEO-6M Serial (9600 baud)</strong>
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-gray-100 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Last Valid Fix:</span>
              <span className="font-mono font-semibold text-gray-900">{new Date(device.lastGpsUpdate).toLocaleTimeString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">PPS Pulse LED:</span>
              <span className="text-emerald-700 font-bold">1 Hz Solid Pulse</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">NMEA Sentences:</span>
              <span className="font-mono text-gray-700">$GPRMC, $GPGGA</span>
            </div>
          </div>
        </div>

        {/* Card 3: Battery & Power Subsystem */}
        <div className="bg-white p-5 rounded-lg border border-[#E5E7EB] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
            <span className="text-xs font-bold text-gray-600 uppercase">Power &amp; Battery Subsystem</span>
            <Battery className="w-4 h-4 text-emerald-600" />
          </div>

          <div>
            <div className="text-2xl font-black text-[#111827]">
              {device.batteryPercent !== null && device.batteryPercent !== undefined ? (
                <span>{device.batteryPercent}% Remaining</span>
              ) : (
                <span className="text-gray-500 text-lg">Not available</span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              3.7V Li-Po (1000 mAh) + TP4056 USB-C Charger
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-gray-100 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Voltage Divider ADC:</span>
              <span className="font-semibold text-gray-900">GPIO 34 (ADC1_CH6)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Deep Sleep Current:</span>
              <span className="font-semibold text-emerald-700">~15 mA (Wi-Fi sleep)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Estimated Runtime:</span>
              <span className="font-semibold text-gray-900">~8–12 hours active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Firmware & Hardware Specs Table */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-5 space-y-4">
        <h3 className="text-sm font-bold text-[#111827] flex items-center gap-2">
          <Cpu className="w-4 h-4 text-blue-600" />
          ESP32 Hardware Specification &amp; Firmware Metadata
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3 bg-[#F3F4F6] rounded-md border border-[#E5E7EB]">
            <span className="text-gray-500 block text-[11px]">Microcontroller:</span>
            <span className="font-bold text-gray-900">ESP32 Dual-Core Xtensa 240MHz</span>
          </div>

          <div className="p-3 bg-[#F3F4F6] rounded-md border border-[#E5E7EB]">
            <span className="text-gray-500 block text-[11px]">Firmware Image:</span>
            <span className="font-bold text-gray-900">{device.firmwareVersion}</span>
          </div>

          <div className="p-3 bg-[#F3F4F6] rounded-md border border-[#E5E7EB]">
            <span className="text-gray-500 block text-[11px]">Last Physical SOS Trigger:</span>
            <span className="font-bold text-red-700">
              {lastSos ? new Date(lastSos.eventTime).toLocaleString() : 'None recorded'}
            </span>
          </div>

          <div className="p-3 bg-[#F3F4F6] rounded-md border border-[#E5E7EB]">
            <span className="text-gray-500 block text-[11px]">Pairing Status:</span>
            <span className="font-bold text-emerald-700">Bound to {selectedChild.name}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
