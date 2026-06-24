import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Change Password state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user) return null;

  const handleLogout = (e) => {
    e.preventDefault();
    logout();
    navigate('/login');
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to change password.');
      }

      setSuccess('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setShowChangePassword(false);
        setSuccess('');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Error updating password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Determine visibility of role-based items
  const isAdmin = user.role === 'HR_ADMIN' || user.role === 'IT_ADMIN';
  const isDeptHead = ['DEPT_HEAD', 'DEPARTMENT HEAD', 'DEPARTMENT_HEAD'].includes(user.role);
  
  // Show Org Management only for admins and department heads
  const showOrgManagement = isAdmin || isDeptHead;
  
  // Show RBAC Settings only for admins
  const showSettings = isAdmin;

  // Profile link targets
  // Standard employees go to their own profile, others can see directory first or go to self if they have a linked profile
  const profilePath = user.empId 
    ? `/employees/${user.empId}` 
    : '#'; // If admin has no linked profile, disable or hide

  return (
    <>
      <aside className="h-screen w-72 fixed left-0 top-0 bg-white/40 backdrop-blur-xl border-r border-white/40 shadow-[0_40px_40px_rgba(0,0,0,0.04)] flex flex-col py-8 px-6 z-50 select-none">
        {/* Brand Logo & Identity */}
        <div className="mb-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-container rounded-lg flex items-center justify-center text-white shadow-lg">
            <span className="material-symbols-outlined font-fill text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              corporate_fare
            </span>
          </div>
          <div>
            <h1 className="font-display-xl text-[1.5rem] font-bold tracking-tight text-primary">ExecuTrack</h1>
            <p className="text-[10px] font-bold text-outline uppercase tracking-wider">HR Operations</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 space-y-2">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 active:scale-[0.98] ${
                isActive
                  ? 'text-primary font-semibold border-r-4 border-primary bg-primary/10 shadow-sm'
                  : 'text-on-surface-variant font-medium hover:bg-white/50 hover:backdrop-blur-md'
              }`
            }
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
            <span className="text-sm">Dashboard</span>
          </NavLink>

          <NavLink
            to="/employees"
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 active:scale-[0.98] ${
                isActive
                  ? 'text-primary font-semibold border-r-4 border-primary bg-primary/10 shadow-sm'
                  : 'text-on-surface-variant font-medium hover:bg-white/50 hover:backdrop-blur-md'
              }`
            }
          >
            <span className="material-symbols-outlined">badge</span>
            <span className="text-sm">Directory</span>
          </NavLink>

          <NavLink
            to="/projects"
            className={({ isActive }) =>
              `flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 active:scale-[0.98] ${
                isActive
                  ? 'text-primary font-semibold border-r-4 border-primary bg-primary/10 shadow-sm'
                  : 'text-on-surface-variant font-medium hover:bg-white/50 hover:backdrop-blur-md'
              }`
            }
          >
            <span className="material-symbols-outlined">folder_shared</span>
            <span className="text-sm">Projects</span>
          </NavLink>

          {showOrgManagement && (
            <NavLink
              to="/organization"
              className={({ isActive }) =>
                `flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 active:scale-[0.98] ${
                  isActive
                    ? 'text-primary font-semibold border-r-4 border-primary bg-primary/10 shadow-sm'
                    : 'text-on-surface-variant font-medium hover:bg-white/50 hover:backdrop-blur-md'
                }`
              }
            >
              <span className="material-symbols-outlined">corporate_fare</span>
              <span className="text-sm">Organization</span>
            </NavLink>
          )}

          {/* Administration header */}
          {(user.empId || showSettings) && (
            <div className="pt-8 pb-4">
              <p className="px-4 text-[10px] font-bold text-outline uppercase tracking-wider">Administration</p>
            </div>
          )}

          {user.empId && (
            <NavLink
              to={profilePath}
              className={({ isActive }) =>
                `flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 active:scale-[0.98] ${
                  isActive
                    ? 'text-primary font-semibold border-r-4 border-primary bg-primary/10 shadow-sm'
                    : 'text-on-surface-variant font-medium hover:bg-white/50 hover:backdrop-blur-md'
                }`
              }
            >
              <span className="material-symbols-outlined">person</span>
              <span className="text-sm">My Profile</span>
            </NavLink>
          )}

          {showSettings && (
            <NavLink
              to="/settings/permissions"
              className={({ isActive }) =>
                `flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 active:scale-[0.98] ${
                  isActive
                    ? 'text-primary font-semibold border-r-4 border-primary bg-primary/10 shadow-sm'
                    : 'text-on-surface-variant font-medium hover:bg-white/50 hover:backdrop-blur-md'
                }`
              }
            >
              <span className="material-symbols-outlined">admin_panel_settings</span>
              <span className="text-sm">RBAC Settings</span>
            </NavLink>
          )}
        </nav>

        {/* User profile block */}
        <div className="mt-auto pt-6 border-t border-outline-variant/20 mb-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
              {user.username.slice(0, 2).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-xs font-bold text-on-surface truncate">{user.username}</h4>
              <p className="text-[10px] font-medium text-outline truncate">{user.role}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setError('');
              setSuccess('');
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
              setShowChangePassword(true);
            }}
            title="Change Password"
            className="w-8 h-8 rounded-lg border border-outline-variant/20 bg-white/50 text-on-surface-variant hover:text-primary hover:bg-white flex items-center justify-center transition-all cursor-pointer shadow-sm shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">key</span>
          </button>
        </div>

        {/* Logout button at the bottom */}
        <div>
          <a
            href="#"
            onClick={handleLogout}
            className="flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 text-error font-semibold hover:bg-error/10"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="text-sm">Logout</span>
          </a>
        </div>
      </aside>

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div 
            className="glass-card max-w-md w-full p-8 rounded-2xl relative shadow-2xl animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="mb-6 flex justify-between items-start">
              <div>
                <h3 className="text-xl font-bold text-on-surface mb-1">Change Password</h3>
                <p className="text-xs text-outline">Update your account password securely.</p>
              </div>
              <button
                onClick={() => {
                  setShowChangePassword(false);
                  setError('');
                  setSuccess('');
                }}
                className="text-on-surface-variant hover:text-error transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </header>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-error-container text-on-error-container text-xs font-semibold flex items-center gap-2 border border-error/20">
                <span className="material-symbols-outlined text-[16px] text-error">error</span>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-semibold flex items-center gap-2 border border-emerald-200">
                <span className="material-symbols-outlined text-[16px] text-emerald-600">check_circle</span>
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant block ml-0.5">Current Password</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="input-glass w-full py-3 px-4 rounded-lg text-sm text-on-surface focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant block ml-0.5">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="input-glass w-full py-3 px-4 rounded-lg text-sm text-on-surface focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant block ml-0.5">Confirm New Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-glass w-full py-3 px-4 rounded-lg text-sm text-on-surface focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePassword(false);
                    setError('');
                    setSuccess('');
                  }}
                  className="flex-1 py-3 rounded-xl border border-outline-variant/20 bg-white/50 text-xs font-bold text-on-surface-variant hover:bg-white transition-all cursor-pointer active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-xl bg-primary text-white text-xs font-bold shadow-md hover:bg-primary-container transition-all cursor-pointer active:scale-[0.98] disabled:opacity-75"
                >
                  {isSubmitting ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
