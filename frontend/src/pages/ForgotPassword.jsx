import React, { useState } from 'react';
import { Mail, Loader2, ArrowLeft, Lock, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.svg';

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1: email, 2: otp + new password, 3: success
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    if (!email) {
      setErrorMsg('Please enter your email.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) throw new Error();

      setStep(2);
    } catch (err) {
      setErrorMsg('Could not start password recovery. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp || !newPassword) {
      setErrorMsg('Enter the code and your new password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, new_password: newPassword }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Invalid code.');
      }

      setStep(3);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="card p-6">
          <div className="flex flex-col items-center text-center mb-5">
            <div className="w-14 h-14 mb-3 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
              <img src={logo} alt="SmartCity Connect" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900">Reset your password</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {step === 1 && 'Enter your email to get a reset code'}
              {step === 2 && 'Enter the code we sent you'}
              {step === 3 && 'All done'}
            </p>
          </div>

          {errorMsg && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
              <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <span className="text-sm text-red-700">{errorMsg}</span>
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleRequestOTP} className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
              <div>
                <label className="label">Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-10"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <button type="submit" disabled={isLoading} className="btn-primary w-full py-2.5">
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Sending…
                  </>
                ) : (
                  'Send reset code'
                )}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleResetPassword} className="space-y-4 animate-in fade-in slide-in-from-right-2 duration-300">
              <p className="text-sm text-gray-500 text-center -mt-1 mb-2">
                Check your inbox for the 6-digit code.
              </p>

              <div>
                <label className="label">6-digit code</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Shield size={16} />
                  </div>
                  <input
                    type="text"
                    maxLength="6"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    className="input pl-10 text-center tracking-[0.4em]"
                    placeholder="••••••"
                  />
                </div>
              </div>

              <div>
                <label className="label">New password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="input pl-10"
                    placeholder="Enter new password"
                  />
                </div>
              </div>

              <button type="submit" disabled={isLoading} className="btn-primary w-full py-2.5">
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Verifying…
                  </>
                ) : (
                  'Reset password'
                )}
              </button>
            </form>
          )}

          {step === 3 && (
            <div className="text-center space-y-3 py-2 animate-in fade-in zoom-in-95 duration-300">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 mb-1">
                <CheckCircle2 size={32} className="text-emerald-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Password updated</h2>
              <p className="text-sm text-gray-500">You can now sign in with your new password.</p>
              <Link to="/login" className="btn-secondary w-full mt-3 inline-flex">
                Return to login
              </Link>
            </div>
          )}
        </div>

        {step !== 3 && (
          <div className="mt-6 flex justify-center">
            <Link to="/login" className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors text-sm">
              <ArrowLeft size={14} /> Cancel
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
