import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Printer,
  Copy,
  RefreshCw,
  AlertOctagon,
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
  Check,
  Info,
  Lock
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const QRIdentificationView: React.FC = () => {
  const {
    selectedChild,
    revokeQrToken,
    regenerateQrToken,
    setScannedTokenForPublicView,
    setActiveNavTab,
  } = useApp();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const printCanvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!selectedChild) {
    return <div className="p-8 text-center text-xs text-gray-500">No child selected.</div>;
  }

  // Construct opaque URL: does NOT contain private personal data
  // Only contains token: e.g. https://.../?token=TAG-7K9A-4R2M-91WQ or host origin
  const scanUrl = `${window.location.origin}/#scan?token=${selectedChild.qrToken}`;

  // Render QR code to canvas
  useEffect(() => {
    if (selectedChild.qrRevoked) return;

    if (canvasRef.current) {
      QRCode.toCanvas(
        canvasRef.current,
        scanUrl,
        {
          width: 220,
          margin: 2,
          color: {
            dark: '#111827',
            light: '#FFFFFF',
          },
        },
        (err) => {
          if (err) console.error('QR code generation error:', err);
        }
      );
    }

    if (printCanvasRef.current) {
      QRCode.toCanvas(
        printCanvasRef.current,
        scanUrl,
        {
          width: 140,
          margin: 1,
          color: {
            dark: '#111827',
            light: '#FFFFFF',
          },
        },
        (err) => {
          if (err) console.error('Print QR generation error:', err);
        }
      );
    }
  }, [selectedChild.qrToken, selectedChild.qrRevoked, scanUrl]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(scanUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleRevoke = async () => {
    if (!confirm(`Are you sure you want to REVOKE the QR tag for ${selectedChild.name}? Scanners will immediately receive an invalid/expired notice.`)) return;
    try {
      await revokeQrToken(selectedChild.id);
      setStatusMessage('QR tag revoked successfully.');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to revoke QR tag.');
    }
  };

  const handleRegenerate = async () => {
    if (!confirm(`Generate a brand-new opaque QR identification token for ${selectedChild.name}? You will need to print and replace the physical tag sticker.`)) return;
    try {
      const newToken = await regenerateQrToken(selectedChild.id);
      setStatusMessage(`New QR token "${newToken}" generated successfully.`);
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Unable to regenerate QR tag.');
    }
  };

  const handleSimulateScan = () => {
    setScannedTokenForPublicView(selectedChild.qrToken);
    setActiveNavTab('public_qr_scan');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#111827]">
            Dynamic QR Identification System
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Cloud-mapped opaque tokens attached to physical ID cards without requiring on-device electronic screens.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSimulateScan}
            className="bg-[#3B82F6] hover:bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Test Scan Experience</span>
          </button>
          <button
            onClick={handlePrint}
            className="bg-[#F3F4F6] hover:bg-gray-200 text-[#111827] text-xs font-bold px-3 py-2 rounded-md border border-[#E5E7EB] flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-gray-700" />
            <span>Print Tag / Badge</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="bg-blue-50 border border-blue-200 text-blue-900 text-xs font-semibold px-4 py-3 rounded-md flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Engineering Design Note (Mandatory requirement explanation) */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-900">
        <div className="flex items-center gap-2 font-bold mb-1">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Architecture Principle: Dynamic Backend Mapping vs. Static Screenless Hardware</span>
        </div>
        <p className="text-amber-800 leading-relaxed">
          The physical child tag is intentionally low-cost and battery-efficient: <strong>it does not contain an OLED or LCD screen</strong>. Instead, a durable printed QR sticker encodes only an unguessable opaque identifier (e.g. <code>{selectedChild.qrToken}</code>). When scanned by any standard smartphone camera, the backend dynamically looks up the child record, applies role-based privacy rules, and allows guardians to revoke or reassign the token remotely without throwing away the physical hardware.
        </p>
      </div>

      {/* Main QR Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: QR Visual & Actions */}
        <div className="bg-white p-5 rounded-lg border border-[#E5E7EB] flex flex-col items-center text-center">
          <div className="w-full flex items-center justify-between pb-3 border-b border-[#E5E7EB] mb-4">
            <span className="text-xs font-bold text-gray-700">Digital Token Preview</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
              selectedChild.qrRevoked ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {selectedChild.qrRevoked ? 'REVOKED / INACTIVE' : 'ACTIVE IN DATABASE'}
            </span>
          </div>

          {selectedChild.qrRevoked ? (
            <div className="w-[220px] h-[220px] bg-red-50 border-2 border-dashed border-red-300 rounded-lg flex flex-col items-center justify-center p-4">
              <AlertOctagon className="w-12 h-12 text-red-500 mb-2" />
              <p className="text-xs font-bold text-red-700">QR Code Revoked</p>
              <p className="text-[11px] text-red-600 mt-1">This sticker will not return child emergency data if scanned.</p>
            </div>
          ) : (
            <div className="p-3 bg-white border border-[#E5E7EB] rounded-lg">
              <canvas ref={canvasRef} className="rounded" />
            </div>
          )}

          <div className="mt-4 w-full">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
              Opaque Identity Token
            </span>
            <div className="bg-[#F3F4F6] border border-[#E5E7EB] rounded p-2 font-mono text-xs font-bold text-[#111827]">
              {selectedChild.qrToken}
            </div>
          </div>

          <div className="mt-4 w-full flex flex-col gap-2">
            <button
              onClick={handleCopyLink}
              disabled={selectedChild.qrRevoked}
              className="w-full bg-[#F3F4F6] hover:bg-gray-200 text-[#111827] text-xs font-bold py-2 px-3 rounded-md border border-[#E5E7EB] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-gray-600" />}
              <span>{copied ? 'Scan URL Copied!' : 'Copy Verification URL'}</span>
            </button>

            {!selectedChild.qrRevoked ? (
              <button
                onClick={handleRevoke}
                className="w-full bg-white hover:bg-red-50 text-red-600 text-xs font-bold py-2 px-3 rounded-md border border-red-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>Revoke Lost/Stolen Tag</span>
              </button>
            ) : (
              <button
                onClick={handleRegenerate}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3 rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Issue Replacement Token</span>
              </button>
            )}

            {!selectedChild.qrRevoked && (
              <button
                onClick={handleRegenerate}
                className="text-xs text-gray-500 hover:text-gray-800 underline py-1 cursor-pointer"
              >
                Regenerate new token
              </button>
            )}
          </div>
        </div>

        {/* Center: Privacy & Access-Controlled Scan Rules */}
        <div className="bg-white p-5 rounded-lg border border-[#E5E7EB] space-y-4">
          <div className="pb-3 border-b border-[#E5E7EB]">
            <h3 className="text-sm font-bold text-[#111827] flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-600" />
              Role-Based Privacy Architecture
            </h3>
            <p className="text-xs text-gray-500">
              Zero sensitive data stored in the QR payload itself.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200">
              <span className="font-bold text-emerald-900 block mb-1">
                ✓ Anonymous Public Scanner (Stranger / Good Samaritan):
              </span>
              <ul className="list-disc list-inside text-emerald-800 space-y-1 text-[11px]">
                <li>Child first name only (for comforting the lost child)</li>
                <li>One-tap &quot;Call Guardian&quot; button ({selectedChild.guardianPhone})</li>
                <li>Critical allergy notice (e.g. &quot;Carries asthma inhaler&quot;)</li>
                <li><strong className="text-red-700 font-bold">NO live GPS coordinates shown</strong></li>
                <li><strong className="text-red-700 font-bold">NO home address or surname revealed</strong></li>
              </ul>
            </div>

            <div className="p-3 rounded-md bg-blue-50 border border-blue-200">
              <span className="font-bold text-blue-900 block mb-1">
                ✓ Authenticated Guardian / Admin Scan:
              </span>
              <ul className="list-disc list-inside text-blue-800 space-y-1 text-[11px]">
                <li>Full child medical history &amp; parent contact list</li>
                <li>Current real-time GPS location &amp; safe zone compliance</li>
                <li>Route adherence &amp; battery telemetry</li>
                <li>One-tap emergency SOS resolution controls</li>
              </ul>
            </div>

            <div className="p-3 rounded-md bg-gray-50 border border-gray-200 text-gray-700 text-[11px]">
              <span className="font-bold block mb-0.5">Physical Tag Loss Protocol:</span>
              If the child loses their ID badge or the tag is photographed by an unauthorized party, the guardian clicks <strong>&quot;Revoke Lost/Stolen Tag&quot;</strong>. The token is instantly marked invalid in the backend.
            </div>
          </div>
        </div>

        {/* Right: Printable Physical ID Card / Badge Preview */}
        <div className="bg-white p-5 rounded-lg border border-[#E5E7EB] flex flex-col justify-between">
          <div>
            <div className="pb-3 border-b border-[#E5E7EB] mb-4">
              <h3 className="text-sm font-bold text-[#111827] flex items-center gap-2">
                <Printer className="w-4 h-4 text-blue-600" />
                Print-Friendly ID Card Layout
              </h3>
              <p className="text-xs text-gray-500">
                Standard CR-80 (85.6mm × 54mm) laminated badge format for school lanyards or backpack pins.
              </p>
            </div>

            {/* Printable ID Card Container */}
            <div
              id="printable-tag-area"
              className="bg-white border-2 border-gray-800 rounded-lg p-3 text-center w-full max-w-[280px] mx-auto shadow-none"
            >
              <div className="text-[10px] font-black uppercase tracking-widest text-blue-700 pb-1 border-b border-gray-300">
                STUDENT SAFETY ID BADGE
              </div>

              <div className="my-2 flex flex-col items-center">
                <canvas ref={printCanvasRef} className="mx-auto" />
                <span className="font-mono text-[9px] font-bold text-gray-800 mt-1">
                  TAG #{selectedChild.deviceId} • {selectedChild.qrToken}
                </span>
              </div>

              <div className="text-[11px] font-black text-gray-900 leading-tight">
                {selectedChild.name}
              </div>
              <div className="text-[9px] text-gray-600">
                {selectedChild.schoolName}
              </div>

              <div className="mt-2 pt-1 border-t border-gray-200 text-[8px] text-gray-700">
                IF CHILD IS LOST: SCAN QR WITH ANY PHONE CAMERA TO CALL GUARDIAN IMMEDIATELY
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#E5E7EB]">
            <button
              onClick={handlePrint}
              className="w-full bg-[#111827] hover:bg-black text-white text-xs font-bold py-2.5 rounded-md flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Child Tag / Lanyard Card</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
