import React, { useState } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Clock,
  MapPin,
  Check,
  X,
  Volume2,
  FileText,
  AlertOctagon
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCoordinates } from '../utils/geoUtils';
import { EmergencyAlert } from '../types';

export const EmergencyAlertsView: React.FC = () => {
  const {
    selectedChild,
    alerts,
    unresolvedAlertCount,
    triggerSos,
    acknowledgeAlert,
    resolveAlert,
    currentUser,
  } = useApp();

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [resolveModalAlert, setResolveModalAlert] = useState<EmergencyAlert | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unresolved' | 'acknowledged' | 'resolved'>('all');

  if (!selectedChild) {
    return <div className="p-8 text-center text-xs text-gray-500">No child selected.</div>;
  }

  const filteredAlerts = alerts.filter((a) => {
    if (statusFilter === 'all') return true;
    return a.status === statusFilter;
  });

  const handleExecuteSos = () => {
    triggerSos(
      selectedChild.id,
      'dashboard_test',
      `Manual emergency SOS drill initiated via web console by ${currentUser?.name || 'Guardian'}`
    );
    setConfirmModalOpen(false);
  };

  const handleConfirmResolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolveModalAlert) return;
    resolveAlert(resolveModalAlert.id, resolveNotes);
    setResolveModalAlert(null);
    setResolveNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-[#111827]">
              SOS Emergency Incident System
            </h2>
            {unresolvedAlertCount > 0 ? (
              <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">
                {unresolvedAlertCount} UNRESOLVED INCIDENTS
              </span>
            ) : (
              <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded border border-emerald-300">
                NO ACTIVE INCIDENTS
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time incident dispatch, hardware button captures, and resolution audit trail.
          </p>
        </div>

        {/* Big SOS Test Trigger Button with Modal Safeguard */}
        <button
          onClick={() => setConfirmModalOpen(true)}
          className="bg-red-600 hover:bg-red-700 active:scale-95 text-white text-xs font-black px-5 py-3 rounded-lg flex items-center gap-2 uppercase tracking-wider transition-all cursor-pointer self-start sm:self-auto"
        >
          <AlertOctagon className="w-5 h-5 text-white animate-bounce" />
          <span>Trigger SOS Emergency Test</span>
        </button>
      </div>

      {/* Confirmation Modal to Prevent Accidental SOS */}
      {confirmModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-none flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E5E7EB] max-w-md w-full p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto text-red-600">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-base font-bold text-[#111827]">
                Confirm Emergency SOS Drill
              </h3>
              <p className="text-xs text-gray-600 mt-1">
                You are about to simulate a critical emergency incident for <strong>{selectedChild.name}</strong> (Device #{selectedChild.deviceId}). This will log an incident in the audit trail.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded p-3 text-[11px] text-amber-900">
              <strong>Notice:</strong> In real operation, the physical push button on the ESP32 activates this exact same pipeline with a loud buzzer and flashing LED on the child&apos;s tag.
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setConfirmModalOpen(false)}
                className="flex-1 bg-[#F3F4F6] hover:bg-gray-200 text-[#111827] text-xs font-bold py-2 rounded-md border border-[#E5E7EB] cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteSos}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 rounded-md uppercase tracking-wider cursor-pointer"
              >
                Confirm SOS Incident
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Incident Resolution Modal */}
      {resolveModalAlert && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-none flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#E5E7EB] max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <h3 className="text-sm font-bold text-[#111827]">Resolve Emergency Incident</h3>
              <button onClick={() => setResolveModalAlert(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-600">
              Please enter an official resolution note before marking incident <strong>#{resolveModalAlert.id}</strong> as cleared.
            </p>

            <form onSubmit={handleConfirmResolve} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Resolution Audit Notes *
                </label>
                <textarea
                  required
                  rows={3}
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  placeholder="e.g., Parent arrived at school gate. Child verified safe and in good health."
                  className="w-full text-xs p-2.5 rounded border border-[#E5E7EB] focus:outline-none focus:border-blue-500 bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResolveModalAlert(null)}
                  className="bg-[#F3F4F6] text-[#111827] text-xs font-semibold px-3 py-2 rounded border border-[#E5E7EB]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded cursor-pointer"
                >
                  Mark as Resolved
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E5E7EB] pb-2">
        <span className="text-xs font-bold text-gray-500 mr-2">Filter by Status:</span>
        {(['all', 'unresolved', 'acknowledged', 'resolved'] as const).map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`text-xs font-bold px-3 py-1.5 rounded-md transition-colors cursor-pointer capitalize ${
              statusFilter === st
                ? 'bg-[#111827] text-white'
                : 'bg-[#F3F4F6] text-gray-700 hover:bg-gray-200'
            }`}
          >
            {st} ({alerts.filter((a) => (st === 'all' ? true : a.status === st)).length})
          </button>
        ))}
      </div>

      {/* Incident List */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="p-8 text-center bg-white border border-[#E5E7EB] rounded-lg">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm font-bold text-[#111827]">No incidents matching filter &quot;{statusFilter}&quot;</p>
            <p className="text-xs text-gray-500 mt-1">All emergencies have been handled or cleared.</p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isUnresolved = alert.status === 'unresolved';
            const isAcknowledged = alert.status === 'acknowledged';

            return (
              <div
                key={alert.id}
                className={`p-5 rounded-lg border transition-all ${
                  isUnresolved
                    ? 'bg-red-50/70 border-red-300 ring-1 ring-red-200'
                    : isAcknowledged
                    ? 'bg-amber-50/60 border-amber-300'
                    : 'bg-white border-[#E5E7EB]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      isUnresolved ? 'bg-red-600 text-white' : isAcknowledged ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
                    }`}>
                      <AlertTriangle className="w-5 h-5" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-[#111827]">{alert.title}</h3>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                          isUnresolved
                            ? 'bg-red-600 text-white animate-pulse'
                            : isAcknowledged
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}>
                          {alert.status}
                        </span>
                        {alert.isSimulated && (
                          <span className="text-[10px] font-semibold bg-gray-200 text-gray-700 px-1.5 py-0.5 rounded">
                            Simulated Drill
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-700 mt-1 leading-relaxed">
                        {alert.description}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          {new Date(alert.eventTime).toLocaleString()}
                        </span>

                        {alert.latitude && alert.longitude && (
                          <span className="flex items-center gap-1 font-mono text-gray-800">
                            <MapPin className="w-3.5 h-3.5 text-blue-600" />
                            {formatCoordinates(alert.latitude, alert.longitude)}
                          </span>
                        )}

                        <span className="font-mono text-[11px] bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                          Device: {alert.deviceId}
                        </span>
                      </div>

                      {/* Audit Log details */}
                      {alert.acknowledgedAt && (
                        <div className="mt-2 text-[11px] text-amber-900 bg-amber-100/50 p-1.5 rounded border border-amber-200/50">
                          <strong>Acknowledged:</strong> {new Date(alert.acknowledgedAt).toLocaleTimeString()} by {alert.acknowledgedBy}
                        </div>
                      )}

                      {alert.resolvedAt && (
                        <div className="mt-2 text-[11px] text-emerald-950 bg-emerald-100/50 p-2 rounded border border-emerald-200/50">
                          <div><strong>Resolved:</strong> {new Date(alert.resolvedAt).toLocaleTimeString()} by {alert.resolvedBy}</div>
                          <div className="text-emerald-900 mt-0.5 italic">&quot;{alert.resolutionNotes}&quot;</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex sm:flex-col gap-2 shrink-0">
                    {isUnresolved && (
                      <button
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-1.5 rounded transition-colors cursor-pointer"
                      >
                        Acknowledge
                      </button>
                    )}

                    {(isUnresolved || isAcknowledged) && (
                      <button
                        onClick={() => setResolveModalAlert(alert)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded transition-colors cursor-pointer"
                      >
                        Resolve &amp; Close
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Realistic Communication Disclosure */}
      <div className="bg-[#F3F4F6] border border-[#E5E7EB] rounded-lg p-4 text-xs text-gray-600">
        <span className="font-bold text-[#111827] block mb-1">
          Hardware &amp; Notification Telemetry Notice:
        </span>
        <p>
          In this college prototype, emergency alerts are dispatched via authenticated WebSocket/HTTP events to the Guardian dashboard. Commercial SMS gateways (Twilio) and WhatsApp APIs require third-party billing credentials and are not hardcoded. The local device activates its onboard piezo buzzer and LED simultaneously.
        </p>
      </div>
    </div>
  );
};
