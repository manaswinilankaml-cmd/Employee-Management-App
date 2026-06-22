import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cardRef = useRef(null);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Forgot password form states
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotAccountType, setForgotAccountType] = useState('EMPLOYEE'); // 'EMPLOYEE' or 'ADMIN'
  const [forgotEmpId, setForgotEmpId] = useState('');
  const [forgotAdminSecret, setForgotAdminSecret] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotShowPassword, setForgotShowPassword] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Parallax effect on mouse move
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!cardRef.current) return;
      const xAxis = (window.innerWidth / 2 - e.pageX) / 100;
      const yAxis = (window.innerHeight / 2 - e.pageY) / 100;
      cardRef.current.style.transform = `rotateY(${xAxis}deg) rotateX(${yAxis}deg)`;
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const result = await login(username, password);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
      setIsSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setForgotSuccess('');

    if (forgotNewPassword !== forgotConfirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (forgotNewPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        username: forgotUsername.trim(),
        new_password: forgotNewPassword,
      };

      if (forgotAccountType === 'EMPLOYEE') {
        if (!forgotEmpId.trim()) {
          setError('Employee ID is required.');
          setIsSubmitting(false);
          return;
        }
        payload.emp_id = forgotEmpId.trim();
      } else {
        if (!forgotAdminSecret.trim()) {
          setError('Admin Security Key is required.');
          setIsSubmitting(false);
          return;
        }
        payload.admin_secret = forgotAdminSecret.trim();
      }

      const response = await fetch('/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Password reset failed.');
      }

      setForgotSuccess(data.message || 'Password reset successfully! You can now login.');
      
      // Reset fields
      setForgotUsername('');
      setForgotEmpId('');
      setForgotAdminSecret('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
    } catch (err) {
      setError(err.message || 'Verification failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden w-full px-4">
      {/* Atmospheric Background Elements */}
      <div className="floating-orb bg-primary/10 top-[-200px] left-[-200px]" />
      <div className="floating-orb bg-secondary/10 bottom-[-200px] right-[-200px]" />

      <main className="w-full max-w-md z-10">
        {/* Brand Identity */}
        <div className="text-center mb-12">
          <h1 className="font-display-xl text-5xl md:text-[3.5rem] text-primary tracking-tight font-extrabold mb-2">
            ExecuTrack
          </h1>
          <p className="text-body-md text-on-surface-variant font-semibold">
            Enterprise Operations Portal
          </p>
        </div>

        {/* Login Card */}
        <div
          ref={cardRef}
          className="glass-card p-8 rounded-2xl relative transition-transform duration-300 ease-out"
          style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
        >
          <header className="mb-6">
            <h2 className="text-2xl font-bold text-on-surface mb-1">
              {!showForgotPassword ? 'Welcome back' : 'Reset password'}
            </h2>
            <p className="text-sm text-outline">
              {!showForgotPassword
                ? 'Please enter your credentials to access your dashboard.'
                : 'Verify your identity to choose a new password.'}
            </p>
          </header>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-error-container text-on-error-container text-xs font-semibold flex items-center gap-2 border border-error/20">
              <span className="material-symbols-outlined text-[16px] text-error">
                error
              </span>
              <span>{error}</span>
            </div>
          )}

          {forgotSuccess && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-2 border border-emerald-200">
              <span className="material-symbols-outlined text-[16px] text-emerald-600">
                check_circle
              </span>
              <span>{forgotSuccess}</span>
            </div>
          )}

          {!showForgotPassword ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username Field */}
              <div className="space-y-1">
                <label
                  className="text-xs font-semibold text-on-surface-variant block ml-1"
                  htmlFor="username"
                >
                  Username
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                    person
                  </span>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. hradmin or username"
                    required
                    className="input-glass w-full py-3 pl-10 pr-4 rounded-lg text-sm text-on-surface placeholder:text-outline/40"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1">
                <div className="flex justify-between items-center px-1">
                  <label
                    className="text-xs font-semibold text-on-surface-variant"
                    htmlFor="password"
                  >
                    Password
                  </label>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setError('');
                      setForgotSuccess('');
                      setShowForgotPassword(true);
                    }}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Forgot?
                  </a>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                    lock
                  </span>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="input-glass w-full py-3 pl-10 pr-12 rounded-lg text-sm text-on-surface placeholder:text-outline/40"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors focus:outline-none"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center px-1 pt-1">
                <input
                  id="remember"
                  type="checkbox"
                  className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary/20 bg-white/50"
                />
                <label
                  className="ml-2 text-xs font-medium text-on-surface-variant cursor-pointer select-none"
                  htmlFor="remember"
                >
                  Stay signed in for 30 days
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`primary-gradient w-full py-4 px-6 rounded-lg text-xs font-bold text-on-primary flex items-center justify-center gap-2 mt-6 cursor-pointer disabled:opacity-75`}
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin material-symbols-outlined text-[18px]">
                      progress_activity
                    </span>
                    Verifying...
                  </>
                ) : (
                  <>
                    Authenticate Securely
                    <span className="material-symbols-outlined text-[18px]">
                      arrow_forward
                    </span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              {/* Account Type Tabs */}
              <div className="flex bg-white/20 p-1 rounded-xl mb-4 border border-outline-variant/10">
                <button
                  type="button"
                  onClick={() => {
                    setForgotAccountType('EMPLOYEE');
                    setError('');
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    forgotAccountType === 'EMPLOYEE'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Employee
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setForgotAccountType('ADMIN');
                    setError('');
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    forgotAccountType === 'ADMIN'
                      ? 'bg-white text-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Admin (No Emp ID)
                </button>
              </div>

              {/* Username Field */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface-variant block ml-1">
                  Username
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                    person
                  </span>
                  <input
                    type="text"
                    value={forgotUsername}
                    onChange={(e) => setForgotUsername(e.target.value)}
                    placeholder="e.g. hradmin or username"
                    required
                    className="input-glass w-full py-3 pl-10 pr-4 rounded-lg text-sm text-on-surface placeholder:text-outline/40"
                  />
                </div>
              </div>

              {/* Verification field based on account type */}
              {forgotAccountType === 'EMPLOYEE' ? (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface-variant block ml-1">
                    Employee ID
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                      badge
                    </span>
                    <input
                      type="text"
                      value={forgotEmpId}
                      onChange={(e) => setForgotEmpId(e.target.value)}
                      placeholder="e.g. IM-2026-0001"
                      required
                      className="input-glass w-full py-3 pl-10 pr-4 rounded-lg text-sm text-on-surface placeholder:text-outline/40"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-on-surface-variant block ml-1">
                    Admin Security Key
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                      vpn_key
                    </span>
                    <input
                      type="password"
                      value={forgotAdminSecret}
                      onChange={(e) => setForgotAdminSecret(e.target.value)}
                      placeholder="Enter SECRET_KEY"
                      required
                      className="input-glass w-full py-3 pl-10 pr-4 rounded-lg text-sm text-on-surface placeholder:text-outline/40"
                    />
                  </div>
                </div>
              )}

              {/* New Password Field */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface-variant block ml-1">
                  New Password
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                    lock
                  </span>
                  <input
                    type={forgotShowPassword ? 'text' : 'password'}
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    required
                    className="input-glass w-full py-3 pl-10 pr-12 rounded-lg text-sm text-on-surface placeholder:text-outline/40"
                  />
                  <button
                    type="button"
                    onClick={() => setForgotShowPassword(!forgotShowPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors focus:outline-none"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {forgotShowPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-on-surface-variant block ml-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                    lock
                  </span>
                  <input
                    type={forgotShowPassword ? 'text' : 'password'}
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="input-glass w-full py-3 pl-10 pr-12 rounded-lg text-sm text-on-surface placeholder:text-outline/40"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="primary-gradient w-full py-4 px-6 rounded-lg text-xs font-bold text-on-primary flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin material-symbols-outlined text-[18px]">
                        progress_activity
                      </span>
                      Updating...
                    </>
                  ) : (
                    <>
                      Reset Password
                      <span className="material-symbols-outlined text-[18px]">
                        published_with_changes
                      </span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setError('');
                    setForgotSuccess('');
                  }}
                  className="w-full py-3 px-6 rounded-lg text-xs font-bold text-on-surface-variant border border-outline-variant/20 bg-white/50 hover:bg-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    arrow_back
                  </span>
                  Back to Login
                </button>
              </div>
            </form>
          )}

          {/* SSO Options */}
          {!showForgotPassword && (
            <div className="mt-6 pt-6 border-t border-outline-variant/20">
              <p className="text-center text-[10px] font-bold text-outline uppercase tracking-wider mb-4">
                Or continue with
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setError('SSO login is currently not configured for this tenant.')}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-white/50 border border-outline-variant/20 hover:bg-white transition-all text-xs font-medium text-on-surface cursor-pointer"
                >
                  <img
                    className="w-4 h-4 object-contain"
                    alt="Okta"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuCX8ylyjuTZRcnkZkWUTJyGk_tMuAOE7MLhsGoCY2yYXAtqhh5lBMBiARcWIC7fam3UNLNXlY9kXp_P3MDfnLRzMr5xgYgaoFTN2IPTNpgvWS3yWU1v5HvZvzjVYa-_w5LNIArYnIaKB4fWXZ7hQ97WghO0crRDBS2EsokFeN8267BEaM8lw7j5-2NyIB-QKKkVcptdDShnocHyE3FGLcr7jH1j-0Mcvj_HuRpVL9CvEmYitaOiALO5i4EitNkim-WxziLhTG10IIpr"
                  />
                  Okta
                </button>
                <button
                  type="button"
                  onClick={() => setError('SSO login is currently not configured for this tenant.')}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-white/50 border border-outline-variant/20 hover:bg-white transition-all text-xs font-medium text-on-surface cursor-pointer"
                >
                  <img
                    className="w-4 h-4 object-contain"
                    alt="Azure"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuB_PTGzk14KPD35ZpvHXa6X1Tr9_FwGM9e-zBVJLIa86rW73SXFGKqkFE5DijTM-TQxEpBFdZjtkH8nkT20UjdG_zjNHoh6nBm1e8xRpwS-ZvGbCRsOjPtBEuck27WQR0uscpOV9KCvL29pECTolvOaQhZGNJTIVPE6Ip6szgxN7zZVQyQm5NkuSXUlonsaDTeAAaKlfo9JHTJbjwMcIgR0wEBnB_sLLZ79JbZH0xOs2zRhcQvtDnqOozEzd_ucgw5Aw-XEGnyLuc6W"
                  />
                  Azure
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Help */}
        <footer className="mt-12 text-center">
          <p className="text-xs text-outline">
            Need technical assistance?{' '}
            <a href="#" className="text-primary font-semibold hover:underline">
              Contact Operations Helpdesk
            </a>
          </p>
          <div className="mt-2 flex justify-center gap-4 opacity-60">
            <span className="text-[10px] uppercase font-bold tracking-wider">
              System Status: Operational
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider">
              v3.0.0-Enterprise
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
}
