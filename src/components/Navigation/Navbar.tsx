import React from 'react';
import { 
  ShieldAlert, 
  User as UserIcon, 
  Radio, 
  HelpCircle, 
  LogOut, 
  AlertTriangle,
  Layers,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const Navbar: React.FC = () => {
  const {
    currentUser,
    logout,
    systemMode,
    setSystemMode,
    childrenList,
    selectedChildId,
    setSelectedChildId,
    unresolvedAlertCount,
    setActiveNavTab,
    resetDemoData,
  } = useApp();

  return (
    <header className="bg-white border-b border-[#E5E7EB] sticky top-0 z-40">
      {/* Simulation / Real Mode Notice Ribbon */}
      <div className={`px-4 py-1 text-xs font-semibold flex items-center justify-between transition-colors ${
        systemMode === 'demo' 
          ? 'bg-amber-50 text-amber-900 border-b border-amber-200' 
          : 'bg-blue-50 text-blue-900 border-b border-blue-200'
      }`}>
        <div className="flex items-center gap-2">
          {systemMode === 'demo' ? (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span><strong>DEMO SIMULATION MODE:</strong> Fictional child profiles and simulated GPS readings for testing. Real tracking is not represented.</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <span><strong>REAL DEVICE MODE:</strong> Live ESP32 ingestion active. Awaiting real hardware packets at <code>/api/devices/location</code>.</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSystemMode(systemMode === 'demo' ? 'real' : 'demo')}
            className={`px-2.5 py-0.5 rounded text-[11px] font-bold border transition-colors cursor-pointer ${
              systemMode === 'demo'
                ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                : 'bg-blue-100 hover:bg-blue-200 text-blue-900 border-blue-300'
            }`}
          >
            Switch to {systemMode === 'demo' ? 'Real Hardware Mode' : 'Demo Simulation Mode'}
          </button>
          {systemMode === 'demo' && (
            <button
              onClick={() => {
                if (confirm('Reset demo state to initial test data?')) {
                  resetDemoData();
                }
              }}
              className="text-amber-800 hover:text-amber-950 underline text-[11px] font-medium ml-2 cursor-pointer"
            >
              Reset Seed Data
            </button>
          )}
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#3B82F6] flex items-center justify-center text-white font-extrabold text-lg">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-[#111827]">
                QR-GPS Child Safety Tag
              </h1>
              <span className="text-[10px] font-bold bg-[#F3F4F6] text-[#4B5563] px-2 py-0.5 rounded border border-[#E5E7EB]">
                STUDENT PROTOTYPE
              </span>
            </div>
            <p className="text-xs text-gray-500">
              ESP32 + NEO-6M IoT Monitoring &amp; Dynamic QR System
            </p>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-3">
          {/* Child Selector */}
          <div className="hidden sm:flex items-center gap-2 bg-[#F3F4F6] px-3 py-1.5 rounded-md border border-[#E5E7EB]">
            <span className="text-xs font-semibold text-gray-600">Active Child:</span>
            <div className="relative">
              <select
                value={selectedChildId}
                onChange={(e) => setSelectedChildId(e.target.value)}
                className="bg-white text-xs font-bold text-[#111827] py-1 pl-2 pr-7 rounded border border-[#E5E7EB] focus:outline-none focus:border-[#3B82F6] cursor-pointer appearance-none"
              >
                {childrenList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.deviceId})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2 top-2 pointer-events-none" />
            </div>
          </div>

          {/* Unresolved Alert Quick Badge */}
          <button
            onClick={() => setActiveNavTab('emergency')}
            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
              unresolvedAlertCount > 0
                ? 'bg-red-50 text-red-700 border-red-300 animate-pulse'
                : 'bg-[#F3F4F6] text-gray-700 border-[#E5E7EB] hover:bg-gray-200'
            }`}
          >
            <ShieldAlert className={`w-4 h-4 ${unresolvedAlertCount > 0 ? 'text-red-600' : 'text-gray-500'}`} />
            <span>SOS Alerts</span>
            {unresolvedAlertCount > 0 && (
              <span className="bg-red-600 text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                {unresolvedAlertCount}
              </span>
            )}
          </button>

          {/* User Auth Info & Role Switcher */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-2 border-l border-[#E5E7EB]">
              <div className="text-right hidden md:block">
                <div className="text-xs font-bold text-[#111827]">{currentUser.name}</div>
                <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                  {currentUser.role === 'admin' ? 'System Administrator' : 'Authorized Guardian'}
                </div>
              </div>
              <div className="relative group">
                <button className="w-8 h-8 rounded-md bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center text-[#111827] font-bold text-xs hover:border-gray-400 cursor-pointer">
                  {currentUser.role === 'admin' ? 'AD' : 'GD'}
                </button>
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-[#E5E7EB] rounded-md p-1.5 hidden group-hover:block z-50 shadow-none">
                  <button
                    onClick={logout}
                    className="w-full text-left px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveNavTab('login')}
                className="bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-bold px-3 py-1.5 rounded-md transition-colors cursor-pointer"
              >
                Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
