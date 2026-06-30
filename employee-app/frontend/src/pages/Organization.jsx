import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Organization() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Create forms state
  const [newDeptName, setNewDeptName] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [isCreatingDept, setIsCreatingDept] = useState(false);
  const [isCreatingRole, setIsCreatingRole] = useState(false);

  // Inline edit state
  const [editingDeptId, setEditingDeptId] = useState(null);
  const [editingDeptVal, setEditingDeptVal] = useState('');
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [editingRoleVal, setEditingRoleVal] = useState('');

  // Toast feedback
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchData = async () => {
    setLoading(true);
    const headers = { 'Authorization': `Bearer ${user.token}` };
    try {
      const deptsRes = await fetch('/departments', { headers });
      if (deptsRes.ok) setDepartments(await deptsRes.json());

      const rolesRes = await fetch('/roles', { headers });
      if (rolesRes.ok) setRoles(await rolesRes.json());

      const empsRes = await fetch('/employees', { headers });
      if (empsRes.ok) setEmployees(await empsRes.json());
    } catch (err) {
      showToast('Error loading organizational structure.', 'error');
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

  // Compute Headcount for departments
  const getDeptHeadcount = (deptName) => {
    return employees.filter(emp => emp.department === deptName).length;
  };

  // Create Department
  const handleCreateDept = async (e) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    setIsCreatingDept(true);
    try {
      const response = await fetch(`/departments?name=${encodeURIComponent(newDeptName.trim())}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` },
      });
      const data = await response.json();
      if (response.ok) {
        showToast(`Department "${newDeptName}" registered successfully.`, 'success');
        setNewDeptName('');
        fetchData();
      } else {
        showToast(data.detail || 'Failed to create department.', 'error');
      }
    } catch (err) {
      showToast('Error creating department.', 'error');
    } finally {
      setIsCreatingDept(false);
    }
  };

  // Rename Department
  const handleRenameDept = async (id, originalName) => {
    if (!editingDeptVal.trim() || editingDeptVal.trim() === originalName) {
      setEditingDeptId(null);
      return;
    }
    try {
      const response = await fetch(`/departments/${id}?new_name=${encodeURIComponent(editingDeptVal.trim())}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${user.token}` },
      });
      const data = await response.json();
      if (response.ok) {
        showToast(`Department renamed to "${editingDeptVal.trim()}".`, 'success');
        setEditingDeptId(null);
        fetchData();
      } else {
        showToast(data.detail || 'Failed to rename department.', 'error');
      }
    } catch (err) {
      showToast('Error renaming department.', 'error');
    }
  };

  // Delete Department
  const handleDeleteDept = async (id, name) => {
    const headcount = getDeptHeadcount(name);
    if (headcount > 0) {
      showToast(`Cannot delete: ${headcount} employee(s) are in department "${name}". Reassign them first.`, 'error');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete department "${name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/departments/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user.token}` },
      });
      if (response.ok) {
        showToast(`Department "${name}" deleted.`, 'success');
        fetchData();
      } else {
        const data = await response.json();
        showToast(data.detail || 'Failed to delete department.', 'error');
      }
    } catch (err) {
      showToast('Error deleting department.', 'error');
    }
  };

  // Create Role
  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    setIsCreatingRole(true);
    try {
      const response = await fetch(`/roles?name=${encodeURIComponent(newRoleName.trim())}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` },
      });
      const data = await response.json();
      if (response.ok) {
        showToast(`Custom role "${newRoleName}" provisioned successfully with read-only permissions.`, 'success');
        setNewRoleName('');
        fetchData();
      } else {
        showToast(data.detail || 'Failed to create role.', 'error');
      }
    } catch (err) {
      showToast('Error creating role.', 'error');
    } finally {
      setIsCreatingRole(false);
    }
  };

  // Rename Role
  const handleRenameRole = async (id, originalName) => {
    if (!editingRoleVal.trim() || editingRoleVal.trim() === originalName) {
      setEditingRoleId(null);
      return;
    }
    try {
      const response = await fetch(`/roles/${id}?new_name=${encodeURIComponent(editingRoleVal.trim())}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${user.token}` },
      });
      const data = await response.json();
      if (response.ok) {
        showToast(`Role renamed to "${editingRoleVal.trim()}".`, 'success');
        setEditingRoleId(null);
        fetchData();
      } else {
        showToast(data.detail || 'Failed to rename role.', 'error');
      }
    } catch (err) {
      showToast('Error renaming role.', 'error');
    }
  };

  // Delete Role
  const handleDeleteRole = async (id, name) => {
    if (!window.confirm(`Are you sure you want to permanently delete custom role "${name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/roles/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user.token}` },
      });
      const data = await response.json();
      if (response.ok) {
        showToast(`Custom role "${name}" has been deleted.`, 'success');
        fetchData();
      } else {
        showToast(data.detail || 'Cannot delete: Dependent records exist.', 'error');
      }
    } catch (err) {
      showToast('Error deleting role.', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <span className="animate-spin material-symbols-outlined text-primary text-5xl">
            progress_activity
          </span>
          <p className="text-on-surface-variant font-medium">Loading Organization Structure...</p>
        </div>
      </div>
    );
  }

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
      <header className="flex justify-between items-end mb-10 w-full">
        <div>
          <h2 className="text-3xl font-extrabold text-on-surface tracking-tight mb-1">Organization Management</h2>
          <p className="text-sm text-outline font-medium">Configure corporate structural units, departments, and access levels.</p>
        </div>
      </header>

      {/* Split Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        
        {/* Department Panel */}
        <section className="glass-card rounded-3xl p-8 flex flex-col gap-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-secondary-container/30 flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-[24px]">account_tree</span>
              </div>
              <h3 className="text-lg font-bold text-on-surface">Department Registry</h3>
            </div>
            <span className="text-[10px] font-bold bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full uppercase tracking-wider">
              {departments.length} Units Active
            </span>
          </div>

          {/* Department Create form */}
          <div className="bg-surface-container-low/30 rounded-2xl p-6 border border-white/40">
            <h4 className="text-[10px] font-bold text-outline uppercase mb-3 tracking-wider ml-0.5">Register New Department</h4>
            <form onSubmit={handleCreateDept} className="flex gap-3">
              <input
                type="text"
                required
                placeholder="e.g. Core Engineering"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                className="flex-1 bg-white/50 border border-outline-variant/20 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent text-sm outline-none transition-all"
              />
              <button
                type="submit"
                disabled={isCreatingDept}
                className="bg-primary text-white text-xs font-bold px-6 rounded-xl hover:shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Create
              </button>
            </form>
          </div>

          {/* Departments Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant/10 text-xs font-bold text-outline uppercase tracking-wider">
                  <th className="pb-3 px-2">Unit Name</th>
                  <th className="pb-3 text-right">Headcount</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {departments.map((dept) => (
                  <tr key={dept.id} className="group hover:bg-white/40 transition-colors">
                    <td className="py-4 px-2">
                      {editingDeptId === dept.id ? (
                        <input
                          type="text"
                          value={editingDeptVal}
                          onChange={(e) => setEditingDeptVal(e.target.value)}
                          onBlur={() => handleRenameDept(dept.id, dept.name)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameDept(dept.id, dept.name);
                            if (e.key === 'Escape') setEditingDeptId(null);
                          }}
                          autoFocus
                          className="bg-white border border-primary rounded px-2 py-1 text-sm outline-none w-full max-w-[200px]"
                        />
                      ) : (
                        <div
                          onDoubleClick={() => {
                            setEditingDeptId(dept.id);
                            setEditingDeptVal(dept.name);
                          }}
                          className="flex items-center gap-2 cursor-pointer font-bold text-sm text-on-surface"
                          title="Double click to edit inline"
                        >
                          <span>{dept.name}</span>
                          <span className="material-symbols-outlined text-[16px] text-outline opacity-0 group-hover:opacity-100 transition-opacity">
                            edit
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-4 text-right text-sm text-on-surface-variant font-medium">
                      {getDeptHeadcount(dept.name)}
                    </td>
                    <td className="py-4 text-right">
                      <button
                        onClick={() => handleDeleteDept(dept.id, dept.name)}
                        className="p-2 hover:bg-error/10 text-error rounded-lg transition-colors cursor-pointer"
                        title="Delete Unit"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Roles Panel */}
        <section className="glass-card rounded-3xl p-8 flex flex-col gap-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary-container/20 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[24px]">manage_accounts</span>
              </div>
              <h3 className="text-lg font-bold text-on-surface">Role Identity Panel</h3>
            </div>
            <span className="text-[10px] font-bold bg-primary-container text-white px-3 py-1 rounded-full uppercase tracking-wider">
              {roles.length} Access Levels
            </span>
          </div>

          {/* Role Create form */}
          <div className="bg-surface-container-low/30 rounded-2xl p-6 border border-white/40">
            <h4 className="text-[10px] font-bold text-outline uppercase mb-3 tracking-wider ml-0.5">Define Custom Role</h4>
            <form onSubmit={handleCreateRole} className="flex gap-3">
              <input
                type="text"
                required
                placeholder="e.g. Lead Developer"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                className="flex-1 bg-white/50 border border-outline-variant/20 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent text-sm outline-none transition-all"
              />
              <button
                type="submit"
                disabled={isCreatingRole}
                className="bg-secondary text-white text-xs font-bold px-6 rounded-xl hover:shadow-md transition-all cursor-pointer flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">shield_person</span>
                Provision
              </button>
            </form>
          </div>

          {/* Roles Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant/10 text-xs font-bold text-outline uppercase tracking-wider">
                  <th className="pb-3 px-2">Role Identity</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {roles.map((role) => (
                  <tr key={role.id} className={`group hover:bg-white/40 transition-colors ${role.is_system_role ? 'bg-primary/5' : ''}`}>
                    <td className="py-4 px-2">
                      {role.is_system_role ? (
                        <div className="flex items-center gap-2 font-bold text-sm text-primary">
                          <span>{role.name}</span>
                          <span className="material-symbols-outlined text-primary text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                            verified_user
                          </span>
                        </div>
                      ) : editingRoleId === role.id ? (
                        <input
                          type="text"
                          value={editingRoleVal}
                          onChange={(e) => setEditingRoleVal(e.target.value)}
                          onBlur={() => handleRenameRole(role.id, role.name)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameRole(role.id, role.name);
                            if (e.key === 'Escape') setEditingRoleId(null);
                          }}
                          autoFocus
                          className="bg-white border border-primary rounded px-2 py-1 text-sm outline-none w-full max-w-[200px]"
                        />
                      ) : (
                        <div
                          onDoubleClick={() => {
                            setEditingRoleId(role.id);
                            setEditingRoleVal(role.name);
                          }}
                          className="flex items-center gap-2 cursor-pointer font-bold text-sm text-on-surface"
                          title="Double click to edit inline"
                        >
                          <span>{role.name}</span>
                          <span className="material-symbols-outlined text-[16px] text-outline opacity-0 group-hover:opacity-100 transition-opacity">
                            edit
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="py-4 text-xs font-bold">
                      {role.is_system_role ? (
                        <span className="px-2 py-0.5 bg-primary/20 text-primary rounded text-[9px] uppercase tracking-wide">
                          System Default
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] uppercase tracking-wide">
                          Custom Role
                        </span>
                      )}
                    </td>
                    <td className="py-4 text-right">
                      {role.is_system_role ? (
                        <button className="p-2 text-outline/40 cursor-not-allowed" disabled>
                          <span className="material-symbols-outlined text-[18px]">lock</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDeleteRole(role.id, role.name)}
                          className="p-2 hover:bg-error/10 text-error rounded-lg transition-colors cursor-pointer"
                          title="Delete Custom Role"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

    </div>
  );
}
