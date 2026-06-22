import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Employees() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  
  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('All Departments');
  
  // Skill Search state
  const [skillSearchDept, setSkillSearchDept] = useState('');
  const [skillSearchTerm, setSkillSearchTerm] = useState('');
  const [isSkillSearchActive, setIsSkillSearchActive] = useState(false);

  // Add Employee Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDept, setNewDept] = useState('');
  const [addError, setAddError] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // General Notification Toast
  const [toast, setToast] = useState(null);

  const isAdmin = user?.role === 'HR_ADMIN' || user?.role === 'IT_ADMIN';

  // Helper to trigger Toast messages
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const response = await fetch('/employees', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      } else {
        showToast('Failed to fetch employee directory.', 'error');
      }
    } catch (error) {
      showToast('Network error while fetching directory.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await fetch('/departments', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setDepartments(data);
        if (data.length > 0) {
          setSkillSearchDept(data[0].name);
          setNewDept(data[0].name);
        }
      }
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchEmployees();
    fetchDepartments();
  }, [user, navigate]);

  // Handle Skill Search submit
  const handleSkillSearch = async (e) => {
    e.preventDefault();
    if (!skillSearchTerm.trim()) {
      showToast('Please enter a skill to search.', 'warning');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/employees/department/${skillSearchDept}/skill/${skillSearchTerm}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        // Skill search returns {id, emp_id, name, department, skills}
        // Let's adapt it to our table (add placeholder role/manager_id values)
        const mappedData = data.map(item => ({
          ...item,
          role: 'Employee (Found via Skill)',
          manager_id: null
        }));
        setEmployees(mappedData);
        setIsSkillSearchActive(true);
        showToast(`Found ${data.length} employees with skill "${skillSearchTerm}" in ${skillSearchDept}.`, 'success');
      } else {
        const errorData = await response.json();
        showToast(errorData.detail || 'Skill search failed.', 'error');
      }
    } catch (error) {
      showToast('Error executing skill search.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClearSkillSearch = () => {
    setSkillSearchTerm('');
    setIsSkillSearchActive(false);
    fetchEmployees();
  };

  // Add employee API call
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setAddError('');
    if (!newName.trim()) {
      setAddError('Name is required.');
      return;
    }

    setIsAdding(true);
    try {
      // POST /createemployee?name=<name>&department=<department>
      const response = await fetch(`/createemployee?name=${encodeURIComponent(newName.trim())}&department=${encodeURIComponent(newDept)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        showToast(`Employee "${newName}" onboarding successful!`, 'success');
        setNewName('');
        setShowAddModal(false);
        fetchEmployees();
      } else {
        setAddError(data.detail || 'Failed to onboard employee.');
      }
    } catch (error) {
      setAddError('Network error onboarding employee.');
    } finally {
      setIsAdding(false);
    }
  };

  // Delete employee API call
  const handleDeleteEmployee = async (empId, empName) => {
    if (!window.confirm(`Are you sure you want to permanently delete employee ${empName} (${empId})? This will also purge their user accounts and skill tags.`)) {
      return;
    }

    try {
      const response = await fetch(`/employees/${empId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        showToast(data.message || `Employee ${empName} deleted.`, 'success');
        fetchEmployees();
      } else {
        showToast(data.detail || 'Failed to delete employee. Reassign dependent fields first.', 'error');
      }
    } catch (error) {
      showToast('Network error during employee deletion.', 'error');
    }
  };

  // Lookup manager name in client side list
  const getManagerName = (managerId) => {
    if (!managerId) return 'None';
    const manager = employees.find(emp => emp.id === managerId);
    return manager ? manager.name : 'Unknown Manager';
  };

  // Filter local employees if skill search is NOT active
  const filteredEmployees = isSkillSearchActive
    ? employees // Display results directly if searched by skill
    : employees.filter((emp) => {
        const matchesSearch =
          emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.emp_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          getManagerName(emp.manager_id).toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesDept =
          selectedDept === 'All Departments' ||
          emp.department === selectedDept;

        return matchesSearch && matchesDept;
      });

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
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 max-w-container-max w-full gap-4">
        <div>
          <nav className="flex gap-2 text-outline mb-2">
            <Link to="/dashboard" className="text-xs font-semibold hover:underline">Company</Link>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-xs font-semibold text-primary">Directory</span>
          </nav>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-1">
            Employee Directory
          </h1>
          <p className="text-outline text-sm">
            Manage, onboard, and search your enterprise workforce across departments.
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="primary-gradient text-white px-6 py-3 rounded-xl text-xs font-bold shadow-md hover:shadow-primary/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Add New Employee
          </button>
        )}
      </header>

      {/* Search & Filters Bento Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8 max-w-container-max w-full">
        {/* Main Text Search & Department Dropdown Filter */}
        <div className="lg:col-span-8 glass-card rounded-2xl p-6 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1 relative w-full">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline text-[20px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search by name, employee ID, or manager..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isSkillSearchActive}
              className="w-full bg-white/50 border border-outline-variant/20 rounded-xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-sm disabled:opacity-50"
            />
          </div>
          <div className="hidden sm:block h-10 w-[1px] bg-outline-variant/30" />
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            disabled={isSkillSearchActive}
            className="bg-white/50 border border-outline-variant/20 rounded-xl py-3 px-4 text-on-surface text-sm focus:ring-2 focus:ring-primary cursor-pointer w-full sm:w-56 disabled:opacity-50"
          >
            <option>All Departments</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.name}>{dept.name}</option>
            ))}
          </select>
        </div>

        {/* Skill Search Widget */}
        <form onSubmit={handleSkillSearch} className="lg:col-span-4 glass-card rounded-2xl p-6 flex flex-col justify-between gap-4">
          <div className="flex justify-between items-start w-full">
            <span className="text-xs font-bold text-primary uppercase tracking-wider">Skill Finder Widget</span>
            <span className="material-symbols-outlined text-outline text-[20px]">psychology</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={skillSearchDept}
              onChange={(e) => setSkillSearchDept(e.target.value)}
              className="bg-white/50 border border-outline-variant/20 rounded-xl py-2 px-3 text-on-surface text-xs focus:ring-2 focus:ring-primary cursor-pointer flex-1"
            >
              {departments.map(dept => (
                <option key={dept.id} value={dept.name}>{dept.name}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Skill (e.g. Python)"
              value={skillSearchTerm}
              onChange={(e) => setSkillSearchTerm(e.target.value)}
              className="bg-white/50 border border-outline-variant/20 rounded-xl py-2 px-3 focus:ring-2 focus:ring-primary outline-none text-xs flex-[2]"
            />
            {isSkillSearchActive ? (
              <button
                type="button"
                onClick={handleClearSkillSearch}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-error/10 text-error hover:bg-error/25 transition-all cursor-pointer shadow-sm"
                title="Clear Search"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            ) : (
              <button
                type="submit"
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all cursor-pointer shadow-sm"
                title="Search Skill"
              >
                <span className="material-symbols-outlined text-[18px]">search</span>
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Directory Table */}
      <section className="max-w-container-max w-full glass-card rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/10 bg-white/30">
                <th className="px-6 py-5 text-xs font-bold text-outline uppercase tracking-wider">Emp ID</th>
                <th className="px-6 py-5 text-xs font-bold text-outline uppercase tracking-wider">Name</th>
                <th className="px-6 py-5 text-xs font-bold text-outline uppercase tracking-wider">Department</th>
                <th className="px-6 py-5 text-xs font-bold text-outline uppercase tracking-wider">System Role</th>
                <th className="px-6 py-5 text-xs font-bold text-outline uppercase tracking-wider">Manager</th>
                <th className="px-6 py-5 text-xs font-bold text-outline uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-sm text-outline">
                    Loading records...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-sm text-outline">
                    No employees found matching the filters.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-white/40 transition-colors group">
                    <td className="px-6 py-4 text-xs font-semibold text-outline">
                      {emp.emp_id}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          {emp.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-on-surface">{emp.name}</div>
                          <div className="text-[10px] text-outline font-medium">
                            {emp.name.toLowerCase().replace(/\s+/g, '.')}@executrack.com
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-primary/10 text-primary rounded-lg text-[10px] font-bold">
                        {emp.department}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant font-medium">
                      {emp.role}
                    </td>
                    <td className="px-6 py-4 text-sm text-on-surface-variant font-medium">
                      {getManagerName(emp.manager_id)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => navigate(`/employees/${emp.emp_id}`)}
                          className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-primary/10 text-primary transition-all cursor-pointer"
                          title="View Profile Details"
                        >
                          <span className="material-symbols-outlined text-[20px]">visibility</span>
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteEmployee(emp.emp_id, emp.name)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-error/10 text-error transition-all cursor-pointer"
                            title="Delete Employee"
                          >
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Add Employee Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-inverse-surface/30 backdrop-blur-sm transition-all duration-300">
          <div className="glass-card w-full max-w-lg rounded-3xl p-8 shadow-4xl transform scale-100 transition-all duration-300">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-extrabold text-on-surface">Onboard New Employee</h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setAddError('');
                }}
                className="text-outline hover:text-error transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            
            {addError && (
              <div className="mb-4 p-3 rounded-lg bg-error-container text-on-error-container text-xs font-semibold flex items-center gap-2 border border-error/20">
                <span className="material-symbols-outlined text-[16px] text-error">error</span>
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleAddEmployee} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-outline block ml-0.5">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Eleanor Vance"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-white/50 border border-outline-variant/30 rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-outline block ml-0.5">Department</label>
                <select
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  className="w-full bg-white/50 border border-outline-variant/30 rounded-xl py-3 px-4 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none text-sm cursor-pointer"
                >
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setAddError('');
                  }}
                  className="flex-1 py-3.5 border border-outline-variant/40 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container-high/40 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdding}
                  className="flex-[2] py-3.5 premium-gradient text-white rounded-xl text-xs font-bold shadow-lg active:scale-95 transition-all cursor-pointer disabled:opacity-70"
                >
                  {isAdding ? 'Creating Profile...' : 'Create Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
