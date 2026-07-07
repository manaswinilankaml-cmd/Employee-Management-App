import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    employees: 0,
    projects: 0,
    departments: 0,
    roles: 0,
  });
  const [recentEmployees, setRecentEmployees] = useState([]);
  const [loggedEmployee, setLoggedEmployee] = useState(null);
  
  // Permission checks for UI actions
  const [permissions, setPermissions] = useState({
    canCreateEmployee: false,
    canManageRBAC: false,
  });

  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      const headers = {
        'Authorization': `Bearer ${user.token}`,
        'Content-Type': 'application/json',
      };

      try {
        // 1. Fetch Employees
        const empResponse = await fetch('/employees', { headers });
        let employeesData = [];
        if (empResponse.ok) {
          employeesData = await empResponse.json();
          setRecentEmployees(employeesData.slice(0, 3)); // show first 3
        }

        // 2. Fetch Projects
        const projResponse = await fetch('/projects', { headers });
        const projectsData = projResponse.ok ? await projResponse.json() : [];

        // 3. Fetch Departments
        const deptResponse = await fetch('/departments', { headers });
        const deptsData = deptResponse.ok ? await deptResponse.json() : [];

        // 4. Fetch Roles (might return 403 for non-admins)
        const rolesResponse = await fetch('/roles', { headers });
        const rolesData = rolesResponse.ok ? await rolesResponse.json() : [];

        // Set Stats Counts
        setStats({
          employees: employeesData.length,
          projects: projectsData.length,
          departments: deptsData.length,
          roles: rolesData.length,
        });

        // 5. Find current user's profile details if linked
        if (user.employeeId) {
          const selfProfile = employeesData.find(emp => emp.id === user.employeeId);
          if (selfProfile) {
            setLoggedEmployee(selfProfile);
          }
        }

        // 6. Infer permissions based on user role
        const isAdmin = user.role === 'HR_ADMIN' || user.role === 'IT_ADMIN';
        const isDeptHead = ['DEPT_HEAD', 'DEPARTMENT HEAD', 'DEPARTMENT_HEAD'].includes(user.role);
        
        setPermissions({
          canCreateEmployee: isAdmin, // only admin can create employee by default
          canManageRBAC: isAdmin,
        });

      } catch (error) {
        console.error('Error fetching dashboard statistics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <span className="animate-spin material-symbols-outlined text-primary text-5xl">
            progress_activity
          </span>
          <p className="text-on-surface-variant font-medium">Loading Dashboard Data...</p>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === 'HR_ADMIN' || user?.role === 'IT_ADMIN';
  const isManager = user?.role === 'MANAGER';
  const isDeptHead = ['DEPT_HEAD', 'DEPARTMENT HEAD', 'DEPARTMENT_HEAD'].includes(user?.role);

  return (
    <div className="flex-1 p-8 max-w-[1800px] w-full mx-auto">
      {/* Top Banner Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h2 className="text-3xl font-extrabold text-on-surface tracking-tight mb-1">
            Executive Overview
          </h2>
          <p className="text-sm text-on-surface-variant font-medium">
            Welcome back, <span className="text-primary font-bold">{loggedEmployee?.name || user?.username}</span>. Here is the operational status.
          </p>
        </div>
      </header>


      {/* Stats Cards Row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {/* Total Employees */}
        <div className="glass-card p-6 rounded-2xl flex flex-col gap-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform duration-500" />
          <div className="flex justify-between items-start">
            <div className="p-3 bg-primary/10 rounded-xl text-primary">
              <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                groups
              </span>
            </div>
            {isAdmin && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-100/50 px-2.5 py-1 rounded-full">
                <span className="material-symbols-outlined text-[12px] font-bold">trending_up</span> +12%
              </span>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-0.5">
              Total Employees
            </p>
            <h3 className="text-3xl font-extrabold text-on-surface">{stats.employees}</h3>
          </div>
        </div>

        {/* Active Projects */}
        <div className="glass-card p-6 rounded-2xl flex flex-col gap-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/5 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform duration-500" />
          <div className="flex justify-between items-start">
            <div className="p-3 bg-secondary-fixed/30 rounded-xl text-secondary">
              <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                layers
              </span>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-bold text-on-surface-variant bg-surface-container-high/60 px-2.5 py-1 rounded-full">
              Stable
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-0.5">
              Active Projects
            </p>
            <h3 className="text-3xl font-extrabold text-on-surface">{stats.projects}</h3>
          </div>
        </div>

        {/* Departments */}
        <div className="glass-card p-6 rounded-2xl flex flex-col gap-4 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-tertiary/5 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform duration-500" />
          <div className="flex justify-between items-start">
            <div className="p-3 bg-tertiary-fixed/40 rounded-xl text-tertiary">
              <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                account_tree
              </span>
            </div>
            {isAdmin && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-full">
                High Yield
              </span>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-0.5">
              Departments
            </p>
            <h3 className="text-3xl font-extrabold text-on-surface">{stats.departments}</h3>
          </div>
        </div>

        {/* Custom Roles (Only visible if the roles endpoint loaded successfully) */}
        {isAdmin && (
          <div className="glass-card p-6 rounded-2xl flex flex-col gap-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-error/5 rounded-full -mr-8 -mt-8 group-hover:scale-110 transition-transform duration-500" />
            <div className="flex justify-between items-start">
              <div className="p-3 bg-error-container/60 rounded-xl text-error">
                <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                  verified_user
                </span>
              </div>
              <span className="flex items-center gap-1 text-[10px] font-bold text-error bg-error-container/50 px-2.5 py-1 rounded-full">
                <span className="material-symbols-outlined text-[12px] font-bold">lock</span> Secure
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-0.5">
                System Roles
              </p>
              <h3 className="text-3xl font-extrabold text-on-surface">{stats.roles}</h3>
            </div>
          </div>
        )}
      </section>

      {/* Main Grid Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recent Activity & Visualizations */}
        <div className="lg:col-span-3 space-y-8">
          {/* Data Table */}
          <div className="glass-card rounded-3xl overflow-hidden shadow-sm">
            <div className="px-8 py-6 border-b border-outline-variant/10 flex justify-between items-center bg-white/20">
              <h4 className="text-lg font-bold text-on-surface">Recent Employee Directory Activity</h4>
              <Link to="/employees" className="text-primary font-semibold text-xs hover:underline">
                View All
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container-low/40 border-b border-outline-variant/10">
                  <tr>
                    <th className="px-8 py-4 text-[10px] font-bold text-outline uppercase tracking-wider">Employee</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-outline uppercase tracking-wider">Department</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-outline uppercase tracking-wider">Status</th>
                    <th className="px-8 py-4 text-[10px] font-bold text-outline uppercase tracking-wider">Access Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {recentEmployees.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-8 py-8 text-center text-sm text-outline">
                        No recent activity found.
                      </td>
                    </tr>
                  ) : (
                    recentEmployees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-white/30 transition-colors">
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                              {emp.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <p className="font-semibold text-on-surface text-sm">{emp.name}</p>
                              <p className="text-[10px] text-on-surface-variant font-medium">{emp.emp_id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-4 text-sm text-on-surface-variant font-medium">
                          {emp.department}
                        </td>
                        <td className="px-8 py-4">
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100/70 text-emerald-700 text-[10px] font-bold flex items-center gap-1.5 w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Active
                          </span>
                        </td>
                        <td className="px-8 py-4">
                          <span className="px-2.5 py-1 rounded-full bg-primary-fixed text-primary text-[10px] font-bold uppercase tracking-wider">
                            {emp.role}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>


        </div>

      </div>
    </div>
  );
}
