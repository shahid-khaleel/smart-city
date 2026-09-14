import React, { useState } from 'react';
import { CheckCircle2, User, Phone, MapPin, Globe, AlertCircle, Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.svg';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneCode: '+91',
    phoneNumber: '',
    country: 'India',
    state: '',
    city: '',
    area: '',
    houseNo: '',
  });

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isIndia = formData.country.trim().toLowerCase() === 'india';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.fullName || !formData.email || !formData.password) {
      setError('Name, email and password are required.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await register({
        full_name: formData.fullName,
        email: formData.email,
        password: formData.password,
        role: 'Citizen',
        phone: `${formData.phoneCode}${formData.phoneNumber}`,
        country: formData.country,
        state: isIndia ? formData.state : null,
        city: isIndia ? formData.city : null,
        area: isIndia ? formData.area : null,
        house_no: isIndia ? formData.houseNo : null,
      });

      if (!result.success) {
        setError(result.error);
      } else {
        setIsSuccess(true);
        setTimeout(() => navigate('/login'), 2500);
      }
    } catch (err) {
      setError('Registration failed. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const fieldClass = (disabled) => `input text-sm ${disabled ? 'opacity-50' : ''}`;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6 py-10">
      <div className="w-full max-w-xl animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="card p-6">
          {/* Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 mb-3 rounded-xl overflow-hidden border border-gray-200 shadow-sm">
              <img src={logo} alt="SmartCity Connect" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900">Create your account</h1>
            <p className="text-xs text-gray-500 mt-0.5">Join SmartCity Connect as a citizen</p>
          </div>

          {isSuccess ? (
            <div className="text-center space-y-3 py-8 animate-in fade-in zoom-in-95 duration-300">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 mb-1">
                <CheckCircle2 size={32} className="text-emerald-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Account created</h2>
              <p className="text-sm text-gray-500">Redirecting you to login…</p>
              <Link to="/login" className="btn-secondary inline-flex mt-4">
                Go to login now
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <span className="text-sm text-red-700">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Identity */}
                <div className="space-y-3.5 p-3.5 border border-gray-200 rounded-lg bg-gray-50/60">
                  <h2 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <User size={14} /> Your details
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="label">Full name</label>
                      <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className={fieldClass()} placeholder="Jane Doe" />
                    </div>

                    <div className="md:col-span-2">
                      <label className="label">Email</label>
                      <input type="email" name="email" value={formData.email} onChange={handleChange} className={fieldClass()} placeholder="you@example.com" />
                    </div>

                    <div>
                      <label className="label">Password</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          className={`${fieldClass()} pr-10`}
                          placeholder="••••••••"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors">
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="label">Confirm password</label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          className={`${fieldClass()} pr-10`}
                          placeholder="••••••••"
                        />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors">
                          {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div className="space-y-3.5 p-3.5 border border-gray-200 rounded-lg bg-gray-50/60">
                  <h2 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Phone size={14} /> Phone number
                  </h2>

                  <div className="flex gap-2">
                    <select name="phoneCode" value={formData.phoneCode} onChange={handleChange} className="input w-28 text-center cursor-pointer">
                      <option value="+91">+91 (IN)</option>
                      <option value="+1">+1 (US)</option>
                      <option value="+44">+44 (UK)</option>
                      <option value="+84">+84 (VN)</option>
                      <option value="+971">+971 (AE)</option>
                    </select>
                    <input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} className="input flex-1" placeholder="9876543210" />
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-3.5 p-3.5 border border-gray-200 rounded-lg bg-gray-50/60">
                  <div className="flex justify-between items-center">
                    <h2 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <MapPin size={14} /> Location
                    </h2>
                    {!isIndia && (
                      <span className="badge badge-amber">
                        <AlertCircle size={11} /> Regional fields disabled
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="label flex items-center gap-1">
                        <Globe size={12} /> Country
                      </label>
                      <input type="text" name="country" value={formData.country} onChange={handleChange} className={fieldClass()} placeholder="Enter country" />
                    </div>

                    <div>
                      <label className="label">State</label>
                      <input type="text" name="state" disabled={!isIndia} value={formData.state} onChange={handleChange} className={fieldClass(!isIndia)} placeholder="Karnataka" />
                    </div>

                    <div>
                      <label className="label">City</label>
                      <input type="text" name="city" disabled={!isIndia} value={formData.city} onChange={handleChange} className={fieldClass(!isIndia)} placeholder="Bengaluru" />
                    </div>

                    <div>
                      <label className="label">Area / locality</label>
                      <input type="text" name="area" disabled={!isIndia} value={formData.area} onChange={handleChange} className={fieldClass(!isIndia)} placeholder="Koramangala" />
                    </div>

                    <div>
                      <label className="label">House / apt no.</label>
                      <input type="text" name="houseNo" disabled={!isIndia} value={formData.houseNo} onChange={handleChange} className={fieldClass(!isIndia)} placeholder="Apt 4B" />
                    </div>
                  </div>
                </div>

                <button type="submit" disabled={isLoading} className="btn-primary w-full py-2.5">
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Creating account…
                    </>
                  ) : (
                    'Create account'
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        {!isSuccess && (
          <div className="mt-6 flex justify-center">
            <Link to="/login" className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors text-sm">
              <ArrowLeft size={14} /> Back to login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Register;
