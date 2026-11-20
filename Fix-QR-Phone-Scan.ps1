$ErrorActionPreference = 'Stop'

# Run this script from the qr-gps-child-safety-tag project folder.
$required = @(
  '.\src\App.tsx',
  '.\src\views\PublicQRScanView.tsx',
  '.\src\views\QRIdentificationView.tsx'
)
foreach ($file in $required) {
  if (-not (Test-Path $file)) { throw "Missing $file. Open the project folder and run this script there." }
}

$backup = ".\qr-fix-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $backup | Out-Null
foreach ($file in $required) {
  $destination = Join-Path $backup ($file -replace '^\.\\','')
  $parent = Split-Path $destination -Parent
  New-Item -ItemType Directory -Force -Path $parent | Out-Null
  Copy-Item $file $destination
}

# 1) Route #scan?token=... URLs directly to the public scanner page.
$appPath = '.\src\App.tsx'
$app = Get-Content $appPath -Raw
if ($app -notmatch "import React, \{ useState, useEffect \} from 'react';") {
  $app = $app.Replace("import React, { useState } from 'react';", "import React, { useState, useEffect } from 'react';")
}
$oldDestructure = 'const { activeNavTab, setActiveNavTab, unresolvedAlertCount } = useApp();'
$newDestructure = 'const { activeNavTab, setActiveNavTab, unresolvedAlertCount, setScannedTokenForPublicView } = useApp();'
if ($app.Contains($oldDestructure)) {
  $app = $app.Replace($oldDestructure, $newDestructure)
} elseif ($app -notmatch 'setScannedTokenForPublicView') {
  throw 'Could not locate MainAppContent context declaration in App.tsx.'
}
$anchor = "  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);"
$effect = @'
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
'@
if ($app.Contains($anchor) -and $app -notmatch 'openQrFromUrl') {
  $app = $app.Replace($anchor, $effect.TrimEnd())
}
Set-Content -Path $appPath -Value $app -Encoding UTF8

# 2) Fetch the scanned student's public details from the Flask backend.
$public = @'
import React, { useEffect, useState } from 'react';
import { ArrowLeft, AlertTriangle, Heart, Phone, School, ShieldAlert, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

type ScanResult = {
  valid?: boolean;
  revoked?: boolean;
  error?: string;
  message?: string;
  access_level?: string;
  child_first_name?: string;
  school_name?: string | null;
  emergency_contact_phone?: string;
  notes?: string | null;
};

export const PublicQRScanView: React.FC = () => {
  const { scannedTokenForPublicView, setActiveNavTab } = useApp();
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const token = scannedTokenForPublicView || (() => {
    const hash = window.location.hash;
    const queryStart = hash.indexOf('?');
    return queryStart >= 0
      ? new URLSearchParams(hash.slice(queryStart + 1)).get('token')
      : null;
  })();

  useEffect(() => {
    let cancelled = false;
    const loadStudent = async () => {
      if (!token) {
        setError('No QR token was found in this link. Please scan the student QR code again.');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      setResult(null);
      try {
        const response = await fetch(`/api/qr/scan/${encodeURIComponent(token)}`);
        const data: ScanResult = await response.json();
        if (cancelled) return;
        if (!response.ok) {
          setResult(data);
          setError(data.message || data.error || 'Student record was not found.');
        } else {
          setResult(data);
        }
      } catch {
        if (!cancelled) setError('Cannot connect to the student database. Check that the backend server is running.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadStudent();
    return () => { cancelled = true; };
  }, [token]);

  const revoked = result?.revoked === true;
  const valid = result?.valid === true;

  return (
    <div className="max-w-xl mx-auto space-y-5 py-4">
      <div className="flex items-center justify-between">
        <button onClick={() => setActiveNavTab('qr')} className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5">
          <ArrowLeft className="w-3.5 h-3.5" /> Return to Guardian Dashboard
        </button>
        <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded border">SMARTPHONE SCANNER VIEW</span>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className={`p-5 text-white text-center ${revoked ? 'bg-red-600' : valid ? 'bg-gray-900' : 'bg-amber-600'}`}>
          {revoked ? <ShieldAlert className="w-8 h-8 mx-auto mb-2" /> : valid ? <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-emerald-400" /> : <AlertTriangle className="w-8 h-8 mx-auto mb-2" />}
          <h2 className="text-lg font-bold">{loading ? 'LOOKING UP STUDENT...' : revoked ? 'QR TAG REVOKED' : valid ? 'STUDENT SAFETY DETAILS' : 'QR SCAN NOT VERIFIED'}</h2>
          {token && <p className="text-xs text-gray-300 mt-1">Token: <span className="font-mono">{token}</span></p>}
        </div>

        <div className="p-6">
          {loading && <p className="text-sm text-gray-600 text-center">Retrieving student details from the database...</p>}
          {!loading && error && (
            <div className={`rounded-md border p-4 text-sm ${revoked ? 'bg-red-50 border-red-200 text-red-800' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
              <strong>{revoked ? 'This QR code is no longer active.' : 'Unable to display student details.'}</strong>
              <p className="mt-1">{error}</p>
            </div>
          )}
          {!loading && valid && result && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-md border border-gray-200 p-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xl">
                  {(result.child_first_name || 'S').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{result.child_first_name} (Student)</h3>
                  <p className="text-sm text-gray-600 flex items-center gap-1"><School className="w-4 h-4" /> {result.school_name || 'School not provided'}</p>
                </div>
              </div>
              {result.notes && (
                <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-900">
                  <p className="font-bold flex items-center gap-2 mb-1"><Heart className="w-4 h-4 text-red-600" /> Emergency care information</p>
                  <p>{result.notes}</p>
                </div>
              )}
              {result.emergency_contact_phone && (
                <a href={`tel:${result.emergency_contact_phone.replace(/[^+\d]/g, '')}`} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-3 px-4 rounded-md flex items-center justify-center gap-2">
                  <Phone className="w-4 h-4" /> Call Guardian: {result.emergency_contact_phone}
                </a>
              )}
              <p className="text-[11px] text-gray-500 text-center">Only limited emergency information is shown to public scanners. Home address and live GPS location are not displayed.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
'@
$public = $public.Replace("`n;`n", "`n;`n")
Set-Content -Path '.\src\views\PublicQRScanView.tsx' -Value $public -Encoding UTF8

# 3) Use the computer's LAN URL in QR codes so another phone on the same Wi-Fi can open them.
$qrPath = '.\src\views\QRIdentificationView.tsx'
$qr = Get-Content $qrPath -Raw
$oldUrl = 'const scanUrl = `${window.location.origin}/#scan?token=${selectedChild.qrToken}`;'
$newUrl = 'const publicBaseUrl = (import.meta as any).env?.VITE_PUBLIC_APP_URL || window.location.origin;' + "`r`n" + '  const scanUrl = `${publicBaseUrl}/#scan?token=${selectedChild.qrToken}`;'
if ($qr.Contains($oldUrl)) {
  $qr = $qr.Replace($oldUrl, $newUrl)
} elseif ($qr -notmatch 'VITE_PUBLIC_APP_URL') {
  throw 'Could not locate QR scan URL line in QRIdentificationView.tsx.'
}
Set-Content -Path $qrPath -Value $qr -Encoding UTF8

# Find the active Wi-Fi/LAN IPv4 address and configure the frontend QR base URL.
$ip = Get-NetIPConfiguration |
  Where-Object { $_.IPv4DefaultGateway -and $_.IPv4Address } |
  ForEach-Object { $_.IPv4Address.IPAddress } |
  Where-Object { $_ -and $_ -notmatch '^(127\.|169\.254\.)' } |
  Select-Object -First 1
if ($ip) {
  Set-Content -Path '.\.env.local' -Value "VITE_PUBLIC_APP_URL=http://${ip}:3000" -Encoding ASCII
  Write-Host "Phone QR base URL set to http://${ip}:3000" -ForegroundColor Green
} else {
  Write-Warning 'Could not detect your LAN IP. Run ipconfig and set VITE_PUBLIC_APP_URL in .env.local manually.'
}

Write-Host "`nQR scan changes applied. Backup: $backup" -ForegroundColor Green
Write-Host 'Next: restart the frontend dev server and backend, then generate a fresh QR code.' -ForegroundColor Yellow
