import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Profile() {
  const { id } = useParams(); // human-readable emp_id (e.g. IM-2026-0001)
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [reportees, setReportees] = useState([]);
  const [rolesList, setRolesList] = useState([]);
  
  // Account Status state (Admin-only)
  const [account, setAccount] = useState(null);
  const [accountsList, setAccountsList] = useState([]);
  const [showAccountCard, setShowAccountCard] = useState(false);
  
  // Create Account form state
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [accountError, setAccountError] = useState('');
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  // Admin Reset Password states
  const [isAdminResetting, setIsAdminResetting] = useState(false);
  const [adminResetNewPassword, setAdminResetNewPassword] = useState('');
  const [adminResetNewUsername, setAdminResetNewUsername] = useState('');
  const [adminResetError, setAdminResetError] = useState('');
  const [isAdminResetSubmitting, setIsAdminResetSubmitting] = useState(false);


  // Form states
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState('');
  const [managerId, setManagerId] = useState('');
  const [supervisedDepts, setSupervisedDepts] = useState([]);
  const [initialSupervisedDepts, setInitialSupervisedDepts] = useState([]);


  // Skill state
  const [newSkill, setNewSkill] = useState('');
  const [skills, setSkills] = useState([]);

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const isAdmin = user?.role === 'HR_ADMIN' || user?.role === 'IT_ADMIN';
  const isEmployeeRole = user?.role === 'EMPLOYEE';
  const isOwnProfile = employee?.id === user?.employeeId;
  const isProfileAdmin = employee?.role === 'HR_ADMIN' || employee?.role === 'IT_ADMIN' || account?.role === 'HR_ADMIN' || account?.role === 'IT_ADMIN';
  const canManageReportingLine = user?.role === 'HR_ADMIN' || user?.role === 'IT_ADMIN' || ['DEPT_HEAD', 'DEPARTMENT HEAD', 'DEPARTMENT_HEAD'].includes(user?.role);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchProfile = async () => {
    const headers = { 'Authorization': `Bearer ${user.token}` };
    try {
      // 1. Fetch Employee Profile
      const res = await fetch(`/employees/${id}`, { headers });
      if (!res.ok) {
        throw new Error('Employee profile not found.');
      }
      const data = await res.ok ? await res.json() : null;
      setEmployee(data);
      setName(data.name);
      setDepartment(data.department);
      setRole(data.role || '');
      setManagerId(data.manager_id || '');
      setSkills(data.skills || []);

      // 2. Fetch Reportees
      const reporteesRes = await fetch(`/employees/${id}/reportees`, { headers });
      if (reporteesRes.ok) {
        const reporteesData = reporteesRes.ok ? await reporteesRes.json() : [];
        setReportees(reporteesData);
      }

      // 3. Fetch Accounts if admin
      if (isAdmin) {
        const accsRes = await fetch('/auth/accounts', { headers });
        if (accsRes.ok) {
          const accs = await accsRes.json();
          setAccountsList(accs);
          const linkedAcc = accs.find(acc => acc.employee_id === data.id);
          setAccount(linkedAcc || null);
          setShowAccountCard(true);
        }

        // 4. Fetch Supervised Departments
        const supervisionRes = await fetch(`/employees/${data.id}/supervisions`, { headers });
        if (supervisionRes.ok) {
          const supervisionsData = await supervisionRes.json();
          const supervisedIds = supervisionsData.map(d => d.department_id);
          setSupervisedDepts(supervisedIds);
          setInitialSupervisedDepts(supervisedIds);
        } else {
          setSupervisedDepts([]);
          setInitialSupervisedDepts([]);
        }
      }

    } catch (err) {
      showToast(err.message || 'Error fetching employee details.', 'error');
    }
  };

  const fetchLookupData = async () => {
    const headers = { 'Authorization': `Bearer ${user.token}` };
    try {
      const deptsRes = await fetch('/departments', { headers });
      if (deptsRes.ok) setDepartments(await deptsRes.json());

      const empsRes = await fetch('/employees', { headers });
      if (empsRes.ok) setAllEmployees(await empsRes.json());

      const rolesRes = await fetch('/roles', { headers });
      if (rolesRes.ok) setRolesList(await rolesRes.json());
    } catch (err) {
      console.error('Error fetching lookup data:', err);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    setLoading(true);
    Promise.all([fetchProfile(), fetchLookupData()]).finally(() => setLoading(false));
  }, [id, user, navigate]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    const headers = {
      'Authorization': `Bearer ${user.token}`,
      'Content-Type': 'application/json',
    };

    try {
      // Check Name change
      if (name.trim() !== employee.name) {
        const res = await fetch(`/employees/${employee.emp_id}/update-name?new_name=${encodeURIComponent(name.trim())}`, {
          method: 'PUT',
          headers,
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || 'Failed to update name.');
        }
      }

      // Check Department change
      if (department !== employee.department) {
        const res = await fetch(`/employees/${employee.emp_id}/assign-department/${encodeURIComponent(department)}`, {
          method: 'PUT',
          headers,
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || 'Failed to update department.');
        }
      }

      // Check Role change (Admin only)
      if (isAdmin && role !== employee.role) {
        const res = await fetch(`/employees/${employee.emp_id}/update-role?new_role=${encodeURIComponent(role)}`, {
          method: 'PUT',
          headers,
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || 'Failed to update role.');
        }
      }

      // Check Department Supervision changes (Admin only)
      if (isAdmin) {
        // Added supervisions
        const toAdd = supervisedDepts.filter(id => !initialSupervisedDepts.includes(id));
        for (const deptId of toAdd) {
          const res = await fetch(`/departments/${deptId}/supervisors/${employee.id}`, {
            method: 'POST',
            headers,
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Failed to assign department supervisor scope.');
          }
        }

        // Removed supervisions
        const toRemove = initialSupervisedDepts.filter(id => !supervisedDepts.includes(id));
        for (const deptId of toRemove) {
          const res = await fetch(`/departments/${deptId}/supervisors/${employee.id}`, {
            method: 'DELETE',
            headers,
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Failed to remove department supervisor scope.');
          }
        }
      }

      showToast('Profile information saved successfully.', 'success');
      fetchProfile();

    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Change Manager
  const handleManagerChange = async (newMgrId) => {
    const headers = { 'Authorization': `Bearer ${user.token}` };
    try {
      if (!newMgrId) {
        // Remove manager
        const res = await fetch(`/employees/${employee.emp_id}/remove-manager`, {
          method: 'PUT',
          headers,
        });
        if (res.ok) {
          showToast('Manager removed.', 'success');
          fetchProfile();
        } else {
          const err = await res.json();
          throw new Error(err.detail || 'Failed to remove manager.');
        }
      } else {
        // Find the emp_id for this database integer manager ID
        const targetMgr = allEmployees.find(e => e.id === parseInt(newMgrId));
        if (!targetMgr) throw new Error('Selected manager not found.');

        const res = await fetch(`/employees/${employee.emp_id}/manager?manager_emp_id=${targetMgr.emp_id}`, {
          method: 'PUT',
          headers,
        });
        if (res.ok) {
          showToast(`Manager assigned to ${targetMgr.name}.`, 'success');
          fetchProfile();
        } else {
          const err = await res.json();
          throw new Error(err.detail || 'Circular reporting loops are not allowed.');
        }
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Manage Skills
  const handleAddSkill = async (e) => {
    e.preventDefault();
    if (!newSkill.trim()) return;
    
    const headers = {
      'Authorization': `Bearer ${user.token}`,
      'Content-Type': 'application/json',
    };

    try {
      const res = await fetch(`/employees/${employee.emp_id}/skills`, {
        method: 'PUT',
        headers,
        body: JSON.stringify([newSkill.trim()]),
      });

      if (res.ok) {
        showToast(`Skill "${newSkill.trim()}" added.`, 'success');
        setNewSkill('');
        fetchProfile();
      } else {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to add skill.');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleRemoveSkill = async (skillName) => {
    const headers = { 'Authorization': `Bearer ${user.token}` };
    try {
      const res = await fetch(`/employees/${employee.emp_id}/skills/${encodeURIComponent(skillName)}`, {
        method: 'DELETE',
        headers,
      });

      if (res.ok) {
        showToast(`Skill "${skillName}" removed.`, 'success');
        fetchProfile();
      } else {
        const err = await res.json();
        throw new Error(err.detail || 'Failed to remove skill.');
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Account Actions
  const handleCreateAccount = async (e) => {
    e.preventDefault();
    setAccountError('');
    if (!newUsername.trim() || !newPassword.trim()) {
      setAccountError('Username and password are required.');
      return;
    }

    setIsCreatingAccount(true);
    try {
      const res = await fetch(`/auth/create-account/${employee.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword.trim(),
          role: role,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Login account created successfully.', 'success');
        setNewUsername('');
        setNewPassword('');
        fetchProfile();
      } else {
        setAccountError(data.detail || 'Failed to create login account.');
      }
    } catch (err) {
      setAccountError('Network error creating login account.');
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const handleToggleAccountStatus = async () => {
    if (!account) return;
    const headers = { 'Authorization': `Bearer ${user.token}` };
    const action = account.is_active ? 'deactivate' : 'reactivate';
    
    if (account.role === 'HR_ADMIN' || account.role === 'IT_ADMIN') {
      showToast('Cannot deactivate administrator accounts.', 'error');
      return;
    }

    try {
      const res = await fetch(`/auth/${action}/${account.id}`, {
        method: 'PUT',
        headers,
      });

      if (res.ok) {
        showToast(`Account status updated to ${account.is_active ? 'Deactivated' : 'Active'}.`, 'success');
        fetchProfile();
      } else {
        const err = await res.json();
        showToast(err.detail || 'Failed to update account status.', 'error');
      }
    } catch (err) {
      showToast('Network error updating account status.', 'error');
    }
  };

  const handleAdminResetPassword = async (e) => {
    e.preventDefault();
    setAdminResetError('');
    
    const usernameChanged = adminResetNewUsername.trim() !== account.username;
    const hasPassword = adminResetNewPassword.trim().length > 0;
    
    if (!usernameChanged && !hasPassword) {
      setAdminResetError('Please modify the username or type a new password.');
      return;
    }
    
    if (hasPassword && adminResetNewPassword.trim().length < 6) {
      setAdminResetError('New password must be at least 6 characters.');
      return;
    }

    setIsAdminResetSubmitting(true);
    try {
      const response = await fetch(`/auth/admin-reset-password/${account.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          new_password: hasPassword ? adminResetNewPassword.trim() : null,
          new_username: usernameChanged ? adminResetNewUsername.trim() : null
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to update account details.');
      }

      showToast(`Account details for '${adminResetNewUsername.trim()}' updated successfully.`, 'success');
      setAdminResetNewPassword('');
      setAdminResetNewUsername('');
      setIsAdminResetting(false);
      fetchProfile();
    } catch (err) {
      setAdminResetError(err.message || 'Error updating account details.');
    } finally {
      setIsAdminResetSubmitting(false);
    }
  };


  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <span className="animate-spin material-symbols-outlined text-primary text-5xl">
            progress_activity
          </span>
          <p className="text-on-surface-variant font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Filter out self from manager select options to prevent circular hierarchy
  const managerOptions = allEmployees.filter(emp => emp.id !== employee?.id);

  return (
    <div className="flex-1 p-8 max-w-[1800px] w-full mx-auto relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] p-4 rounded-xl shadow-2xl flex items-center gap-3 border transition-all duration-300 transform scale-100 ${
          toast.type === 'error'
            ? 'bg-error-container text-on-error-container border-error/20'
            : toast.type === 'warning'
            ? 'bg-amber-100 text-amber-800 border-amber-200'
            : 'bg-emerald-100 text-emerald-800 border-emerald-200'
        }`}>
          <span className="material-symbols-outlined text-[20px]">
            {toast.type === 'error' ? 'error' : toast.type === 'warning' ? 'warning' : 'check_circle'}
          </span>
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 gap-4">
        <div>
          <nav className="flex items-center gap-2 mb-2 text-outline font-medium text-xs">
            <Link to="/employees" className="hover:underline">Directory</Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-primary font-bold">Employee Profile</span>
          </nav>
          <h2 className="text-3xl font-extrabold text-on-surface tracking-tight mb-1">{employee?.name}</h2>
          <p className="text-sm text-on-surface-variant font-medium">
            {employee?.role || 'Standard Employee'} • {employee?.department} Team
          </p>
        </div>
        <div className="flex gap-3">
          {isEmployeeRole ? (
            <button
              type="button"
              onClick={() => navigate('/employees')}
              className="px-6 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-lg hover:opacity-90 transition-all active:scale-[0.98] cursor-pointer"
            >
              Back to Directory
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => navigate('/employees')}
                className="px-6 py-2 rounded-xl border border-outline-variant/40 bg-white/50 text-xs font-bold text-on-surface-variant hover:bg-white transition-all active:scale-[0.98] cursor-pointer"
              >
                Discard Changes
              </button>
              <button
                type="submit"
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="px-6 py-2 rounded-xl bg-gradient-to-br from-primary to-primary-container text-white text-xs font-bold shadow-lg shadow-primary/10 hover:opacity-90 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-75"
              >
                {isSaving ? 'Saving Profile...' : 'Save Profile'}
              </button>
            </>
          )}
        </div>
      </header>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (Personal Info & Hierarchy) */}
        <section className="lg:col-span-8 flex flex-col gap-8">
          {/* Basic Info Panel */}
          <div className="glass-card p-8 rounded-3xl shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-2xl">
                  {name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-on-surface">Personal Information</h3>
                  <p className="text-xs text-on-surface-variant">Update employee profile card metrics</p>
                </div>
              </div>
              <span className="px-3 py-1.5 bg-surface-container-high rounded-full text-xs font-bold text-outline">
                ID: {employee?.emp_id}
              </span>
            </div>
            
            <form onSubmit={handleSaveProfile} className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-on-surface-variant px-0.5">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isEmployeeRole}
                  className="w-full h-12 bg-white/50 border border-outline-variant/30 rounded-xl px-4 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all disabled:opacity-75 disabled:cursor-not-allowed"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-on-surface-variant px-0.5">Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  disabled={isEmployeeRole}
                  className="w-full h-12 bg-white/50 border border-outline-variant/30 rounded-xl px-4 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>

              {isAdmin && (
                <>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="block text-xs font-bold text-on-surface-variant px-0.5">Role</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full h-12 bg-white/50 border border-outline-variant/30 rounded-xl px-4 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none cursor-pointer"
                    >
                      <option value="">Select Role...</option>
                      {rolesList.map((r) => (
                        <option key={r.id} value={r.name}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2 sm:col-span-2 border-t border-outline-variant/10 pt-4">
                    <label className="block text-xs font-bold text-on-surface-variant px-0.5">Supervised Departments (Cross-Department Scope)</label>
                    <p className="text-[10px] text-on-surface-variant mb-2">Select which departments this employee is allowed to supervise or manage reporting lines for.</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {departments.map((dept) => {
                        const isChecked = supervisedDepts.includes(dept.id);
                        return (
                          <label key={dept.id} className="flex items-center gap-2 p-3 bg-white/50 border border-outline-variant/20 rounded-xl cursor-pointer hover:bg-white transition-all text-xs font-medium text-on-surface">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSupervisedDepts([...supervisedDepts, dept.id]);
                                } else {
                                  setSupervisedDepts(supervisedDepts.filter(id => id !== dept.id));
                                }
                              }}
                              className="w-4 h-4 rounded text-primary focus:ring-primary"
                            />
                            {dept.name}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </form>
          </div>

          {/* Reporting Hierarchy Panel */}
          {canManageReportingLine && (
            <div className="glass-card p-8 rounded-3xl shadow-sm">
            <h3 className="text-lg font-bold text-on-surface mb-2">Reporting Line Management</h3>
            <p className="text-xs text-on-surface-variant mb-6">Manage managers and direct report mappings</p>
            
            {/* Direct Manager Selector */}
            <div className="mb-6 p-4 rounded-2xl bg-white/30 border border-outline-variant/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/5 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[24px]">person</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-outline">Direct Manager</p>
                  <p className="text-sm font-bold text-on-surface">
                    {employee?.manager_id ? (() => {
                      const manager = allEmployees.find(e => e.id === employee.manager_id);
                      return manager ? manager.name : 'Linked Manager';
                    })() : 'None'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={managerId}
                  onChange={(e) => {
                    setManagerId(e.target.value);
                    handleManagerChange(e.target.value);
                  }}
                  disabled={isEmployeeRole}
                  className="bg-white/50 border border-outline-variant/20 rounded-xl py-2 px-3 text-xs text-on-surface cursor-pointer w-full sm:w-56 focus:ring-2 focus:ring-primary disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  <option value="">No Manager (Top level)</option>
                  {managerOptions.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.name} ({opt.department})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Direct Reports Table */}
            {reportees.length > 0 ? (
              <div className="overflow-x-auto pt-4">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-outline-variant/10">
                      <th className="pb-3 text-xs font-bold text-outline px-1">Direct Report</th>
                      <th className="pb-3 text-xs font-bold text-outline">Department</th>
                      <th className="pb-3 text-xs font-bold text-outline">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/10">
                    {reportees.map((rep) => (
                      <tr key={rep.id} className="hover:bg-white/30 transition-colors">
                        <td className="py-3 px-1">
                          <Link to={`/employees/${rep.emp_id}`} className="flex items-center gap-3 text-primary hover:underline font-bold text-sm">
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                              {rep.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            {rep.name}
                          </Link>
                        </td>
                        <td className="py-3 text-sm font-medium text-on-surface-variant">{rep.department}</td>
                        <td className="py-3 text-xs font-semibold uppercase tracking-wider text-outline">{rep.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-outline italic text-center py-4 bg-white/10 rounded-xl border border-dashed border-outline-variant/20">
                No direct reports found (this employee is not managing anyone).
              </p>
            )}
          </div>
          )}
        </section>

        {/* Right Column (Account & Skills) */}
        <aside className="lg:col-span-4 flex flex-col gap-8">
          {/* Account Status Card */}
          {showAccountCard && (
            <div className="glass-card p-8 rounded-3xl shadow-sm relative overflow-hidden">
              <h3 className="text-lg font-bold text-on-surface mb-2">Account Configuration</h3>
              
              {account ? (
                // Account Exists
                <div className="space-y-4 pt-2">
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`w-2.5 h-2.5 rounded-full ${account.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-error'}`} />
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${account.is_active ? 'text-emerald-600' : 'text-error'}`}>
                      {account.is_active ? 'Active Login Account' : 'Deactivated Account'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2.5 border-b border-outline-variant/10 text-xs">
                    <span className="text-on-surface-variant font-medium">Username</span>
                    <span className="font-bold text-on-surface">{account.username}</span>
                  </div>

                  <div className="flex justify-between items-center py-2.5 border-b border-outline-variant/10 text-xs">
                    <span className="text-on-surface-variant font-medium">Role</span>
                    <span className="font-bold text-primary">{account.role}</span>
                  </div>

                  {isAdminResetting ? (
                    <form onSubmit={handleAdminResetPassword} className="space-y-3 pt-2 border-t border-outline-variant/10">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-outline">Reset Details / Edit Username</p>
                      
                      {adminResetError && (
                        <div className="p-2.5 rounded-lg bg-error-container text-on-error-container text-[11px] font-semibold flex items-center gap-2 border border-error/10">
                          <span className="material-symbols-outlined text-[14px] text-error">error</span>
                          <span>{adminResetError}</span>
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-outline uppercase block ml-0.5">Username</label>
                        <input
                          type="text"
                          required
                          value={adminResetNewUsername}
                          onChange={(e) => setAdminResetNewUsername(e.target.value)}
                          className="w-full bg-white/50 border border-outline-variant/20 rounded-xl py-2 px-3 text-xs outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-outline uppercase block ml-0.5">New Password (Optional)</label>
                        <input
                          type="text"
                          placeholder="Leave blank to keep current"
                          value={adminResetNewPassword}
                          onChange={(e) => setAdminResetNewPassword(e.target.value)}
                          className="w-full bg-white/50 border border-outline-variant/20 rounded-xl py-2 px-3 text-xs outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>


                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAdminResetting(false);
                            setAdminResetNewPassword('');
                            setAdminResetNewUsername('');
                            setAdminResetError('');
                          }}
                          className="flex-1 py-2 rounded-xl text-xs font-bold border border-outline-variant/20 bg-white/50 hover:bg-white transition-all cursor-pointer"
                        >
                          Cancel
                        </button>

                        <button
                          type="submit"
                          disabled={isAdminResetSubmitting}
                          className="flex-1 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-md hover:bg-primary-container transition-all cursor-pointer disabled:opacity-75"
                        >
                          {isAdminResetSubmitting ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAdminResetting(true);
                          setAdminResetNewPassword('');
                          setAdminResetNewUsername(account.username);
                          setAdminResetError('');
                        }}
                        className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-outline-variant/20 text-on-surface-variant hover:text-primary hover:bg-white/50 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[16px]">lock_reset</span>
                        Reset Pass
                      </button>


                      {account.role !== 'HR_ADMIN' && account.role !== 'IT_ADMIN' && (
                        <button
                          type="button"
                          onClick={handleToggleAccountStatus}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm ${
                            account.is_active
                              ? 'border-error/25 text-error hover:bg-error/5'
                              : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {account.is_active ? 'block' : 'check_circle'}
                          </span>
                          {account.is_active ? 'Deactivate' : 'Reactivate'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                // Create Account Form
                <form onSubmit={handleCreateAccount} className="space-y-4 pt-2">
                  <p className="text-xs text-on-surface-variant">This employee does not have a login account yet.</p>
                  
                  {accountError && (
                    <div className="p-2.5 rounded-lg bg-error-container text-on-error-container text-[11px] font-semibold flex items-center gap-2 border border-error/10">
                      <span className="material-symbols-outlined text-[14px] text-error">error</span>
                      <span>{accountError}</span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-outline uppercase block ml-0.5">Username</label>
                    <input
                      type="text"
                      required
                      placeholder="Username"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="w-full bg-white/50 border border-outline-variant/20 rounded-xl py-2 px-3 text-xs outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-outline uppercase block ml-0.5">Password</label>
                    <input
                      type="password"
                      required
                      placeholder="At least 6 chars"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-white/50 border border-outline-variant/20 rounded-xl py-2 px-3 text-xs outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>


                  <button
                    type="submit"
                    disabled={isCreatingAccount}
                    className="w-full py-3 rounded-xl bg-primary text-white text-xs font-bold shadow-md hover:bg-primary-container transition-all cursor-pointer"
                  >
                    {isCreatingAccount ? 'Creating account...' : 'Create Account'}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Skills Tag Cloud */}
          {!isProfileAdmin && (
            <div className="glass-card p-8 rounded-3xl shadow-sm">
              <h3 className="text-lg font-bold text-on-surface mb-1">Skills & Certifications</h3>
              <p className="text-xs text-on-surface-variant mb-6 font-medium">Competencies mapped to this record</p>
              
              <div className="flex flex-wrap gap-2 mb-6">
                {skills.map((skill, index) => (
                  <span
                    key={index}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-semibold hover:bg-primary/25 transition-all"
                  >
                    {skill}
                    {(isOwnProfile || isAdmin) && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="text-primary/60 hover:text-error transition-colors focus:outline-none cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    )}
                  </span>
                ))}
              </div>

              {(isOwnProfile || isAdmin) && (
                <form onSubmit={handleAddSkill} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add new skill..."
                    value={newSkill}
                    onChange={(e) => setNewSkill(e.target.value)}
                    className="flex-1 bg-white/50 border border-outline-variant/20 rounded-xl py-2 px-3 text-xs outline-none"
                  />
                  <button
                    type="submit"
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                  </button>
                </form>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
