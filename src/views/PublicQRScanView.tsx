import React, { useEffect, useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Phone,
  AlertTriangle,
  ArrowLeft,
  Lock,
  Heart,
  Loader2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { apiUrl, readApiJson } from '../lib/api';

type ScanResult = {
  valid?: boolean;
  revoked?: boolean;
  access_level?: string;
  child_first_name?: string;
  emergency_contact_phone?: string;
  message?: string;
  error?: string;
};

export const PublicQRScanView: React.FC = () => {
  const { scannedTokenForPublicView, setActiveNavTab } = useApp();

  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const token = (() => {
    if (scannedTokenForPublicView) return scannedTokenForPublicView;

    const searchToken = new URLSearchParams(window.location.search).get('token');
    if (searchToken) return searchToken;

    const hash = window.location.hash;
    const queryIndex = hash.indexOf('?');

    if (queryIndex >= 0) {
      return new URLSearchParams(hash.slice(queryIndex + 1)).get('token');
    }

    return null;
  })();

  useEffect(() => {
    let cancelled = false;

    const loadQrDetails = async () => {
      setLoading(true);
      setError(null);
      setResult(null);

      if (!token) {
        setError('No QR token was found. Please scan the student safety tag again.');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          apiUrl(`/api/qr/scan/${encodeURIComponent(token)}`)
        );

        const data: ScanResult = await readApiJson<ScanResult>(response);

        if (cancelled) return;

        setResult(data);

        if (!response.ok) {
          setError(
            data.message ||
            data.error ||
            'This QR code is invalid or unavailable.'
          );
        }
      } catch {
        if (!cancelled) {
          setError(
            'Unable to connect to the server. Please try again later.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadQrDetails();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const revoked = result?.revoked === true;
  const valid = result?.valid === true;
  const phone = result?.emergency_contact_phone;

  return (
    <div className="max-w-xl mx-auto space-y-6 py-4 px-3">

      <div className="flex items-center justify-between">
        <button
          onClick={() => setActiveNavTab('qr')}
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Return to Dashboard
        </button>

        <span className="text-[11px] font-bold text-gray-500 bg-gray-100 px-2.5 py-1 rounded border">
          SMARTPHONE SCANNER VIEW
        </span>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">

        <div className={`p-5 text-white text-center ${
          loading
            ? 'bg-gray-700'
            : revoked
            ? 'bg-red-600'
            : valid
            ? 'bg-gray-900'
            : 'bg-amber-600'
        }`}>
          <div className="w-12 h-12 mx-auto rounded-full bg-white/10 flex items-center justify-center mb-2">

            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : revoked ? (
              <ShieldAlert className="w-6 h-6" />
            ) : valid ? (
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}

          </div>

          <h2 className="text-lg font-bold tracking-tight">
            {loading
              ? 'VERIFYING SAFETY TAG'
              : revoked
              ? 'SAFETY TAG REVOKED'
              : valid
              ? 'VALID CHILD SAFETY TAG'
              : 'QR VERIFICATION FAILED'}
          </h2>

          <p className="text-xs text-gray-300 mt-1">
            {token ? `Token: ${token}` : 'No QR token supplied'}
          </p>
        </div>

        <div className="p-6 space-y-5">

          {loading && (
            <div className="text-center py-8 text-gray-500 text-sm">
              Verifying QR code with the server...
            </div>
          )}

          {!loading && error && (
            <div className={`rounded-md p-4 text-sm ${
              revoked
                ? 'bg-red-50 border border-red-200 text-red-800'
                : 'bg-amber-50 border border-amber-200 text-amber-800'
            }`}>
              <div className="flex items-center gap-2 font-bold mb-2">
                <AlertTriangle className="w-4 h-4" />
                QR Verification Notice
              </div>
              {error}
              {revoked && (
                <p className="mt-2">
                  If you have found a child who needs help, contact local
                  emergency services or school authorities.
                </p>
              )}
            </div>
          )}

          {!loading && valid && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-xs text-blue-900 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Privacy Protection</strong>
                  <p className="mt-1">
                    Only limited emergency information is displayed publicly.
                    Private location and residential information are protected.
                  </p>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg p-5 space-y-4">

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-extrabold text-lg">
                    {(result?.child_first_name || 'C').charAt(0).toUpperCase()}
                  </div>

                  <div>
                    <div className="text-lg font-bold text-gray-900">
                      {result?.child_first_name || 'Child'} (Student)
                    </div>
                    <div className="text-xs text-emerald-700 font-semibold">
                      Verified safety tag
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-900 flex items-start gap-2">
                  <Heart className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <p>
                    If this child needs assistance, please contact the
                    registered emergency contact immediately.
                  </p>
                </div>

                {phone ? (
                  <a
                    href={`tel:${phone}`}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-3 px-4 rounded-md flex items-center justify-center gap-2 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    Call Emergency Contact
                  </a>
                ) : (
                  <div className="bg-gray-100 text-gray-600 text-xs p-3 rounded text-center">
                    No emergency phone number is available.
                    Contact school authorities if assistance is required.
                  </div>
                )}

                <p className="text-center text-[11px] text-gray-500">
                  This QR code provides emergency contact information only.
                </p>
              </div>
            </>
          )}

          {!loading && !valid && !revoked && !error && (
            <div className="text-center text-sm text-gray-600">
              QR verification could not be completed.
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
