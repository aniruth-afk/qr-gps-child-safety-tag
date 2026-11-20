/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navigation/Navbar';
import { Sidebar, NAV_ITEMS } from './components/Navigation/Sidebar';
import { DashboardView } from './views/DashboardView';
import { ChildProfileView } from './views/ChildProfileView';
import { LiveLocationView } from './views/LiveLocationView';
import { QRIdentificationView } from './views/QRIdentificationView';
import { PublicQRScanView } from './views/PublicQRScanView';
import { SafeZonesView } from './views/SafeZonesView';
import { RouteMonitoringView } from './views/RouteMonitoringView';
import { EmergencyAlertsView } from './views/EmergencyAlertsView';
import { LocationHistoryView } from './views/LocationHistoryView';
import { DeviceStatusView } from './views/DeviceStatusView';
import { GISRiskZonesView } from './views/GISRiskZonesView';
import { SettingsHardwareLabView } from './views/SettingsHardwareLabView';
import { LoginView } from './views/LoginView';
import { Menu, X, ShieldAlert } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { activeNavTab, setActiveNavTab, unresolvedAlertCount, setScannedTokenForPublicView } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const openQrFromUrl = () => {
      const hash = window.location.hash;

      if (!hash.startsWith('#scan')) return;

      const queryStart = hash.indexOf('?');
      if (queryStart < 0) return;

      const params = new URLSearchParams(hash.slice(queryStart + 1));
      const token = params.get('token');

      if (token) {
        setScannedTokenForPublicView(token);
        setActiveNavTab('public_qr_scan');
      }
    };

    openQrFromUrl();
    window.addEventListener('hashchange', openQrFromUrl);

    return () => window.removeEventListener('hashchange', openQrFromUrl);
  }, [setScannedTokenForPublicView, setActiveNavTab]);

  const renderActiveView = () => {
    switch (activeNavTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'profile':
        return <ChildProfileView />;
      case 'live':
        return <LiveLocationView />;
      case 'qr':
        return <QRIdentificationView />;
      case 'public_qr_scan':
        return <PublicQRScanView />;
      case 'geofence':
        return <SafeZonesView />;
      case 'routes':
        return <RouteMonitoringView />;
      case 'emergency':
        return <EmergencyAlertsView />;
      case 'history':
        return <LocationHistoryView />;
      case 'device':
        return <DeviceStatusView />;
      case 'gis':
        return <GISRiskZonesView />;
      case 'settings':
        return <SettingsHardwareLabView />;
      case 'login':
        return <LoginView />;
      default:
        return <DashboardView />;
    }
  };

  if (activeNavTab === 'public_qr_scan') {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <PublicQRScanView />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col text-[#111827]">
      {/* Top Navbar */}
      <Navbar />

      {/* Mobile Nav Header Toggle */}
      <div className="md:hidden bg-white border-b border-[#E5E7EB] px-4 py-2.5 flex items-center justify-between">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="flex items-center gap-2 text-xs font-bold text-[#111827] bg-[#F3F4F6] px-3 py-1.5 rounded border border-[#E5E7EB]"
        >
          {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          <span>Menu</span>
        </button>

        <span className="text-xs font-bold text-gray-700 capitalize">
          {activeNavTab.replace('_', ' ')}
        </span>

        {unresolvedAlertCount > 0 && (
          <button
            onClick={() => setActiveNavTab('emergency')}
            className="flex items-center gap-1 bg-red-600 text-white text-[11px] font-bold px-2 py-1 rounded"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>{unresolvedAlertCount} Active</span>
          </button>
        )}
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-[#E5E7EB] p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeNavTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveNavTab(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs font-semibold ${
                  isActive ? 'bg-[#3B82F6] text-white' : 'text-[#111827] hover:bg-[#F3F4F6]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* App Body: Sidebar + Main Content */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <Sidebar />
        </div>

        {/* Dynamic Main Workspace */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-y-auto">
          {renderActiveView()}
        </main>
      </div>

      {/* Compact Status Footer */}
      <footer className="bg-white border-t border-[#E5E7EB] py-3 px-4 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            <strong>QR-GPS Child Safety Tag</strong> â€¢ Student Engineering Capstone Prototype
          </span>
          <span className="text-[11px] text-gray-400">
            ESP32 Microcontroller + u-blox NEO-6M GPS + Dynamic QR Privacy Architecture
          </span>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}

