import React from 'react';
import {
  LayoutDashboard,
  User,
  MapPin,
  QrCode,
  ShieldCheck,
  Navigation,
  AlertTriangle,
  History,
  Cpu,
  Settings,
  Scan,
  Compass
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Guardian Dashboard', icon: LayoutDashboard, badge: null },
  { id: 'profile', label: 'Child Profile', icon: User, badge: null },
  { id: 'live', label: 'Live Location', icon: MapPin, badge: 'Live' },
  { id: 'qr', label: 'QR Identification', icon: QrCode, badge: null },
  { id: 'geofence', label: 'Safe Zones', icon: ShieldCheck, badge: null },
  { id: 'routes', label: 'Route Monitoring', icon: Navigation, badge: null },
  { id: 'emergency', label: 'Emergency Alerts', icon: AlertTriangle, badge: 'sos' },
  { id: 'history', label: 'Location History', icon: History, badge: null },
  { id: 'device', label: 'Device Status', icon: Cpu, badge: null },
  { id: 'gis', label: 'GIS & Hazard Zones', icon: Compass, badge: 'Civil' },
  { id: 'settings', label: 'ESP32 Lab & Backend', icon: Settings, badge: 'API' },
];

export const Sidebar: React.FC = () => {
  const { activeNavTab, setActiveNavTab, unresolvedAlertCount, selectedChild, setScannedTokenForPublicView } = useApp();

  const handleOpenScannerSim = () => {
    if (selectedChild) {
      setScannedTokenForPublicView(selectedChild.qrToken);
      setActiveNavTab('public_qr_scan');
    }
  };

  return (
    <aside className="w-full md:w-64 bg-white border-r border-[#E5E7EB] flex flex-col shrink-0">
      {/* Navigation Links */}
      <div className="p-3 space-y-1">
        <div className="px-3 py-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
          Safety Monitoring
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeNavTab === item.id;
          const isSos = item.id === 'emergency' && unresolvedAlertCount > 0;

          return (
            <button
              key={item.id}
              onClick={() => setActiveNavTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-xs font-semibold transition-colors cursor-pointer text-left ${
                isActive
                  ? 'bg-[#3B82F6] text-white'
                  : 'text-[#111827] hover:bg-[#F3F4F6]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                <span>{item.label}</span>
              </div>

              {/* Badges */}
              {item.id === 'emergency' && unresolvedAlertCount > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-white text-red-600' : 'bg-red-600 text-white animate-pulse'
                }`}>
                  {unresolvedAlertCount}
                </span>
              )}

              {item.badge && item.id !== 'emergency' && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  isActive ? 'bg-white/20 text-white' : 'bg-[#F3F4F6] text-gray-600 border border-[#E5E7EB]'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Simulator Quick Action Card */}
      <div className="mt-auto p-3 border-t border-[#E5E7EB]">
        <div className="bg-[#F3F4F6] border border-[#E5E7EB] rounded-md p-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#111827] mb-1">
            <Scan className="w-4 h-4 text-[#3B82F6]" />
            <span>Simulate QR Phone Scan</span>
          </div>
          <p className="text-[11px] text-gray-600 mb-2.5 leading-snug">
            Test what a stranger or first-responder sees when scanning {selectedChild?.name}&apos;s printed ID card.
          </p>
          <button
            onClick={handleOpenScannerSim}
            className="w-full bg-white hover:bg-gray-100 text-[#111827] text-xs font-bold py-1.5 px-3 rounded border border-[#E5E7EB] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Scan className="w-3.5 h-3.5 text-blue-600" />
            <span>Open Public Scan View</span>
          </button>
        </div>

        <div className="mt-3 px-2 text-[11px] text-gray-500 text-center">
          Prototype v1.0 • ESP32 &amp; NEO-6M
        </div>
      </div>
    </aside>
  );
};
