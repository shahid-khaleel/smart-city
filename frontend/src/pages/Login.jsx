import React, { useState } from 'react';
import { Mail, Loader2, Lock, ArrowLeft, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.svg';

const ROLE_TABS = ['Citizen/Resident', 'Dept', 'Worker', 'Admin'];

function Login() {
  const { login, isLoading } = useAuth();
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('Citizen/Resident');

  // 2FA states
  const [showOTP, setShowOTP] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const goToDashboard = (token) => {
    if (token) localStorage.setItem('token', token);
    window.location.href = '/dashboard';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!credentials.email || !credentials.password) {
      setError('Please enter both your email/phone and password.');
      return;
    }

    const result = await login(credentials);

    if (result.require_2fa) {
      setShowOTP(true);
      setPendingEmail(result.email);
      setError('');
    } else if (!result.success) {
      setError(result.error || 'Login failed.');
    } else {
      goToDashboard(null);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setError('Enter the 6-digit code.');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail, otp_code: otpCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || 'Invalid or expired code.');
        setIsVerifying(false);
        return;
      }

      goToDashboard(data.access_token);
    } catch (err) {
      setError('Network error while verifying the code.');
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Left: login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* Compact header shown only on mobile/tablet, where the branding panel is hidden */}
          <div className="flex lg:hidden flex-col items-center text-center mb-5">
            <div className="w-14 h-14 mb-3 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
              <img src={logo} alt="SmartCity" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900">SmartCity</h1>
            <p className="text-xs text-gray-500 mt-0.5">Sign in to your account</p>
          </div>

          <div className="hidden lg:block mb-6">
            <h1 className="text-lg font-semibold text-gray-900">Sign in</h1>
            <p className="text-xs text-gray-500 mt-0.5">Enter your details to continue</p>
          </div>

          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
              <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {showOTP ? (
            <div className="animate-in fade-in slide-in-from-right-2 duration-300">
              <div className="text-center mb-6">
                <h2 className="text-gray-900 font-medium mb-1">Verify it's you</h2>
                <p className="text-gray-500 text-sm">
                  We sent a 6-digit code to <span className="text-gray-900">{pendingEmail}</span>
                </p>
              </div>

              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <Lock size={16} />
                    </div>
                    <input
                      type="text"
                      maxLength="6"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      className="input pl-10 text-center text-xl tracking-[0.4em]"
                      placeholder="000000"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isVerifying || otpCode.length !== 6}
                  className="btn-primary w-full py-2.5"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Verifying…
                    </>
                  ) : (
                    'Verify & continue'
                  )}
                </button>
              </form>

              <button
                onClick={() => {
                  setShowOTP(false);
                  setOtpCode('');
                  setError('');
                }}
                className="mt-5 flex items-center justify-center gap-1.5 w-full text-gray-500 hover:text-gray-700 transition-colors text-sm"
              >
                <ArrowLeft size={14} /> Back to login
              </button>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-left-2 duration-300">
              <div className="grid grid-cols-4 gap-1.5 mb-5 bg-gray-100 p-1 rounded-lg">
                {ROLE_TABS.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setActiveTab(role)}
                    className={`py-2 px-1 text-xs font-medium rounded-md transition-all ${
                      activeTab === role
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {role === 'Citizen/Resident' ? 'Citizen' : role}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">
                    {activeTab === 'Dept' ? 'Department' : activeTab} email or phone
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <Mail size={16} />
                    </div>
                    <input
                      type="text"
                      name="email"
                      value={credentials.email}
                      onChange={handleChange}
                      className="input pl-10"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="label mb-0">Password</label>
                    <Link to="/forgot-password" className="text-xs text-brand-600 hover:text-brand-700 transition-colors">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <Lock size={16} />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={credentials.password}
                      onChange={handleChange}
                      className="input pl-10 pr-10"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={isLoading} className="btn-primary w-full py-2.5 mt-1">
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Signing in…
                    </>
                  ) : (
                    'Sign in'
                  )}
                </button>
              </form>

              {activeTab === 'Citizen/Resident' && (
                <p className="mt-5 text-center text-sm text-gray-500">
                  New here?{' '}
                  <Link to="/register" className="text-brand-600 hover:text-brand-700 font-medium transition-colors">
                    Create an account
                  </Link>
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: branding panel (hidden on small screens) */}
      <div className="hidden lg:flex w-1/2 bg-brand-600 relative overflow-hidden items-center justify-center">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />
        <div className="relative z-10 text-center px-12 animate-in fade-in slide-in-from-right-2 duration-500">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl overflow-hidden border-2 border-white/25 shadow-lg">
            <img src={logo} alt="SmartCity" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight">SmartCity</h1>
          <p className="text-brand-100 text-sm mt-4 max-w-xs mx-auto leading-relaxed">
            Report civic issues, track their progress, and help build a better city — together.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
