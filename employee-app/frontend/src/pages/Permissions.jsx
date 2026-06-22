import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Permissions() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState([]);
  const [permissionsMatrix, setPermissionsMatrix] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingCell, setUpdatingCell] = useState(null); // { role, resource, action }

  // Toast feedback
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = async () => {
    const headers = { 'Authorization': `Bearer ${user.token}` };
    try {
      const rolesRes = await fetch('/roles', { headers });
      const matrixRes = await fetch('/permissions', { headers });

      if (rolesRes.ok && matrixRes.ok) {
        setRoles(await rolesRes.json());
        setPermissionsMatrix(await matrixRes.json());
      } else {
        // Non-admin users are blocked by FastAPI backend with 403. Redirect to dashboard.
        showToast('Access denied. Admin authority required for RBAC configurations.', 'error');
        setTimeout(() => navigate('/dashboard'), 2000);
      }
    } catch (err) {
      showToast('Error loading permission mappings.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [user, navigate]);

  // Find permissions flag for a specific role, resource, and action
  const getPermissionVal = (roleName, resource, action) => {
    const row = permissionsMatrix.find(
      p => p.role_name === roleName && p.resource === resource
    );
    if (!row) return false;
    
    if (action === 'create') return row.can_create;
    if (action === 'read') return row.can_read;
    if (action === 'update') return row.can_update;
    if (action === 'delete') return row.can_delete;
    return false;
  };

  // Update permission flag in DB
  const handleTogglePermission = async (roleName, resource, action, currentVal) => {
    if (roleName === 'HR_ADMIN' || roleName === 'IT_ADMIN') {
      showToast('System Admin permissions are immutable and cannot be revoked.', 'warning');
      return;
    }

    const newVal = !currentVal;
    setUpdatingCell({ role: roleName, resource, action });

    // Build query params: PUT /permissions/{role_name}/{resource}?can_create=true...
    const queryParams = new URLSearchParams();
    queryParams.set(`can_${action}`, newVal);

    try {
      const response = await fetch(`/permissions/${roleName}/${resource}?${queryParams.toString()}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        showToast(`Access updated: ${roleName} -> ${resource}:${action} = ${newVal ? 'GRANTED' : 'REVOKED'}.`, 'success');
        // Update local matrix state
        setPermissionsMatrix(prev =>
          prev.map(row => {
            if (row.role_name === roleName && row.resource === resource) {
              return {
                ...row,
                [`can_${action}`]: newVal,
              };
            }
            return row;
          })
        );
      } else {
        const data = await response.json();
        showToast(data.detail || 'Failed to update access rule.', 'error');
      }
    } catch (error) {
      showToast('Network error updating permissions.', 'error');
    } finally {
      setUpdatingCell(null);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <span className="animate-spin material-symbols-outlined text-primary text-5xl">
            progress_activity
          </span>
          <p className="text-on-surface-variant font-medium">Loading Permission Matrix...</p>
        </div>
      </div>
    );
  }

  const resources = ['employees', 'projects', 'accounts', 'departments', 'roles'];

  // Filter roles on search input
  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 p-8 max-w-[1800px] w-full mx-auto relative min-h-screen">
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
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6 w-full">
        <div>
          <h2 className="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Role-Based Access Control</h2>
          <p className="text-sm text-on-surface-variant max-w-2xl font-medium">
            Define granular permissions for each user role across the enterprise ecosystem. Changes are logged and applied globally in real-time.
          </p>
        </div>
      </header>

      {/* Admin Warning Alert Card */}
      <div className="mb-8 p-5 rounded-2xl border border-tertiary-container/20 bg-amber-50/70 backdrop-blur-md flex items-start gap-4">
        <div className="p-2 bg-tertiary-fixed text-on-tertiary-fixed rounded-xl shadow-sm">
          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            security
          </span>
        </div>
        <div>
          <h4 className="text-xs font-bold text-on-tertiary-fixed">Immutable System Authority</h4>
          <p className="text-xs text-on-tertiary-fixed/80 mt-1 leading-normal">
            The administrator roles (HR_ADMIN, IT_ADMIN) possess hardcoded master-level access across all resources. Checkbox controls for these roles are read-only to prevent administrative lockouts.
          </p>
        </div>
      </div>

      {/* Matrix Table Section */}
      <section className="glass-card rounded-3xl overflow-hidden shadow-sm flex flex-col mb-8">
        <div className="p-6 border-b border-outline-variant/10 flex flex-col sm:flex-row items-center justify-between bg-white/40 gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">grid_view</span>
            </span>
            <h3 className="text-base font-bold text-on-surface">Interactive Permission Grid</h3>
          </div>
          <div className="relative w-full sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
              search
            </span>
            <input
              type="text"
              placeholder="Filter roles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-full rounded-xl bg-white/50 border border-outline-variant/20 focus:bg-white text-xs outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-surface-container-low/30 border-b border-outline-variant/10 text-center">
                <th className="sticky left-0 z-20 bg-surface-container-low/90 backdrop-blur-md p-5 border-r border-outline-variant/10 min-w-[200px] text-left text-xs font-bold text-outline uppercase tracking-wider">
                  Resource / Role
                </th>
                {resources.map((res) => (
                  <th key={res} colSpan="4" className="p-4 border-r border-outline-variant/10 text-center font-bold text-xs text-on-surface capitalize">
                    {res}
                  </th>
                ))}
              </tr>
              <tr className="bg-surface-container-lowest/30 border-b border-outline-variant/10 text-center">
                <th className="sticky left-0 z-20 bg-surface-container-lowest/90 backdrop-blur-md p-4 border-r border-outline-variant/10" />
                {resources.map((res) => (
                  <React.Fragment key={`${res}-crud`}>
                    <th className="p-2.5 text-[10px] font-bold text-outline uppercase border-l border-outline-variant/5">C</th>
                    <th className="p-2.5 text-[10px] font-bold text-outline uppercase">R</th>
                    <th className="p-2.5 text-[10px] font-bold text-outline uppercase">U</th>
                    <th className="p-2.5 text-[10px] font-bold text-outline uppercase border-r border-outline-variant/10">D</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {filteredRoles.map((role) => {
                const isRoleAdmin = role.name === 'HR_ADMIN' || role.name === 'IT_ADMIN';

                return (
                  <tr key={role.id} className={`hover:bg-white/30 transition-colors ${isRoleAdmin ? 'bg-primary/5' : ''}`}>
                    {/* Role Header */}
                    <td className="sticky left-0 z-10 bg-white/90 backdrop-blur-md p-5 border-r border-outline-variant/10 font-bold text-sm text-on-surface">
                      <div className="flex items-center gap-2">
                        {isRoleAdmin && (
                          <span className="material-symbols-outlined text-primary text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            verified_user
                          </span>
                        )}
                        <span>{role.name}</span>
                      </div>
                    </td>

                    {/* Permissions flags */}
                    {resources.map((res) => {
                      const cVal = getPermissionVal(role.name, res, 'create');
                      const rVal = getPermissionVal(role.name, res, 'read');
                      const uVal = getPermissionVal(role.name, res, 'update');
                      const dVal = getPermissionVal(role.name, res, 'delete');

                      return (
                        <React.Fragment key={`${role.name}-${res}`}>
                          {/* Create */}
                          <td className="p-2.5 text-center border-l border-outline-variant/5">
                            <input
                              type="checkbox"
                              checked={cVal}
                              disabled={isRoleAdmin || (updatingCell && updatingCell.role === role.name && updatingCell.resource === res && updatingCell.action === 'create')}
                              onChange={() => handleTogglePermission(role.name, res, 'create', cVal)}
                              className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                            />
                          </td>
                          {/* Read */}
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={rVal}
                              disabled={isRoleAdmin || (updatingCell && updatingCell.role === role.name && updatingCell.resource === res && updatingCell.action === 'read')}
                              onChange={() => handleTogglePermission(role.name, res, 'read', rVal)}
                              className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                            />
                          </td>
                          {/* Update */}
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={uVal}
                              disabled={isRoleAdmin || (updatingCell && updatingCell.role === role.name && updatingCell.resource === res && updatingCell.action === 'update')}
                              onChange={() => handleTogglePermission(role.name, res, 'update', uVal)}
                              className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                            />
                          </td>
                          {/* Delete */}
                          <td className="p-2.5 text-center border-r border-outline-variant/10">
                            <input
                              type="checkbox"
                              checked={dVal}
                              disabled={isRoleAdmin || (updatingCell && updatingCell.role === role.name && updatingCell.resource === res && updatingCell.action === 'delete')}
                              onChange={() => handleTogglePermission(role.name, res, 'delete', dVal)}
                              className="rounded border-outline-variant text-primary focus:ring-primary w-4 h-4 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                            />
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Matrix Footer Legend */}
        <div className="p-5 bg-surface-container-low/40 border-t border-outline-variant/10 flex justify-between items-center text-xs text-on-surface-variant font-medium">
          <div className="flex gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-primary/20 border border-primary/40 block" /> Granted
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 rounded bg-surface-dim border border-outline-variant/20 block" /> Immutable Settings
            </span>
          </div>
          <p className="italic">CRUD: Create, Read, Update, Delete access privileges</p>
        </div>
      </section>
    </div>
  );
}
