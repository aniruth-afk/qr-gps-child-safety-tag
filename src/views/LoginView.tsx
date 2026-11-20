import React, { useState } from 'react';
import {
  Lock,
  CheckCircle,
  ArrowRight,
  Info
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const LoginView: React.FC = () => {
  const {
    currentUser,
    login,
    setActiveNavTab,
  } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      setActiveNavTab('dashboard');
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : 'Sign in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-6 space-y-6">
      {/* Page Title */}
      <div className="text-center">
        <div className="w-12 h-12 rounded-lg bg-[#3B82F6] text-white flex items-center justify-center mx-auto mb-3 font-extrabold text-xl">
          <Lock className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-[#111827]">
          Role-Based Access Control &amp; Portal Login
        </h2>
        <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
          Authenticate as a Child Guardian or System Administrator to access encrypted telemetry.
        </p>
      </div>

      {/* Currently Logged In State */}
      {currentUser && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold">
              <CheckCircle className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-900">
                Currently Logged In: {currentUser.name}
              </div>
              <div className="text-[11px] text-emerald-700">
                Role: <span className="uppercase font-extrabold">{currentUser.role}</span> • Email: {currentUser.email}
              </div>
            </div>
          </div>
          <button
            onClick={() => setActiveNavTab('dashboard')}
            className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold px-3.5 py-1.5 rounded cursor-pointer flex items-center gap-1"
          >
            <span>Go to Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Login Card */}
      <div className="bg-white rounded-lg border border-[#E5E7EB] p-6 space-y-5">
        <form onSubmit={handleManualLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Registered Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. sarah.martinez@example.com"
              className="w-full text-xs p-2.5 rounded-md border border-[#E5E7EB] focus:outline-none focus:border-blue-500 bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-xs p-2.5 rounded-md border border-[#E5E7EB] focus:outline-none focus:border-blue-500 bg-white"
              required
            />
          </div>

          {loginError && (
            <p className="text-xs text-red-600 font-semibold">{loginError}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#111827] hover:bg-black disabled:opacity-60 text-white text-xs font-bold py-2.5 rounded-md transition-colors cursor-pointer"
          >
            Sign In with Password
          </button>
        </form>

      </div>

      {/* Security Disclaimer Note */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-xs text-gray-600 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed text-[11px]">
          <strong>Security Notice:</strong> Sign-in is verified by the backend. Configure a strong SECRET_KEY, production database, and HTTPS before deployment.
        </p>
      </div>
    </div>
  );
};
