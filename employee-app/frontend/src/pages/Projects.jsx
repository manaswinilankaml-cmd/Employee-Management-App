import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Projects() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  
  // Create project form
  const [projectName, setProjectName] = useState('');
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Manage team slide-over panel
  const [activeProject, setActiveProject] = useState(null);
  const [projectMembers, setProjectMembers] = useState([]);
  const [selectedEmpToAssign, setSelectedEmpToAssign] = useState('');
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [assignError, setAssignError] = useState('');

  // Toast feedback
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const isAdmin = user?.role === 'HR_ADMIN' || user?.role === 'IT_ADMIN';

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await fetch('/projects', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });
      if (response.ok) {
        setProjects(await response.json());
      } else {
        showToast('Failed to fetch projects list.', 'error');
      }
    } catch (error) {
      showToast('Network error fetching projects.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllEmployees = async () => {
    try {
      const response = await fetch('/employees', {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });
      if (response.ok) {
        setAllEmployees(await response.json());
      }
    } catch (error) {
      console.error('Error fetching employees lookup:', error);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchProjects();
    fetchAllEmployees();
  }, [user, navigate]);

  // Create project
  const handleCreateProject = async (e) => {
    e.preventDefault();
    setCreateError('');
    if (!projectName.trim()) {
      setCreateError('Project name cannot be empty.');
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch(`/projects?name=${encodeURIComponent(projectName.trim())}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        showToast(`Project "${projectName}" created successfully!`, 'success');
        setProjectName('');
        fetchProjects();
      } else {
        setCreateError(data.detail || 'A project with this name already exists.');
      }
    } catch (error) {
      setCreateError('Network error creating project.');
    } finally {
      setIsCreating(false);
    }
  };

  // Delete project
  const handleDeleteProject = async (projId, projName) => {
    if (!window.confirm(`Are you sure you want to permanently delete project "${projName}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/projects/${projId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        showToast(`Project "${projName}" deleted successfully.`, 'success');
        fetchProjects();
        if (activeProject && activeProject.id === projId) {
          setActiveProject(null);
        }
      } else {
        const data = await response.json();
        showToast(data.detail || 'Failed to delete project.', 'error');
      }
    } catch (error) {
      showToast('Network error deleting project.', 'error');
    }
  };

  // Open manage team side-over
  const handleManageTeam = async (project) => {
    setActiveProject(project);
    setLoadingMembers(true);
    setAssignError('');
    setSelectedEmpToAssign('');
    try {
      const response = await fetch(`/projects/${project.id}/members`, {
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setProjectMembers(data.members);
      } else {
        showToast('Failed to fetch project members.', 'error');
      }
    } catch (error) {
      showToast('Network error loading project members.', 'error');
    } finally {
      setLoadingMembers(false);
    }
  };

  // Assign employee to project
  const handleAssignMember = async (e) => {
    e.preventDefault();
    setAssignError('');
    if (!selectedEmpToAssign) {
      setAssignError('Please select a member to assign.');
      return;
    }

    try {
      const response = await fetch(`/projects/${activeProject.id}/assign/${selectedEmpToAssign}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        const targetEmp = allEmployees.find(e => e.id === parseInt(selectedEmpToAssign));
        showToast(`${targetEmp ? targetEmp.name : 'Employee'} assigned to project.`, 'success');
        setSelectedEmpToAssign('');
        // Reload project members and projects list
        handleManageTeam(activeProject);
        fetchProjects();
      } else {
        const data = await response.json();
        setAssignError(data.detail || 'Failed to assign member.');
      }
    } catch (error) {
      setAssignError('Network error assigning member.');
    }
  };

  // Remove employee from project
  const handleRemoveMember = async (empId, empName) => {
    if (!window.confirm(`Are you sure you want to remove ${empName} from this project?`)) {
      return;
    }

    try {
      const response = await fetch(`/projects/${activeProject.id}/remove/${empId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.ok) {
        showToast(`${empName} removed from project.`, 'success');
        handleManageTeam(activeProject);
        fetchProjects();
      } else {
        const data = await response.json();
        showToast(data.detail || 'Failed to remove member.', 'error');
      }
    } catch (error) {
      showToast('Network error removing member.', 'error');
    }
  };

  // Get list of employees who are NOT in the active project
  const availableEmployeesToAssign = allEmployees.filter(
    emp => !projectMembers.some(member => member.id === emp.id)
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
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6 w-full">
        <div className="max-w-xl">
          <h2 className="text-3xl font-extrabold text-on-surface tracking-tight mb-2">Active Projects</h2>
          <p className="text-sm text-on-surface-variant font-medium">
            Oversee strategic initiatives, monitor team allocation, and drive organizational performance through centralized project tracking.
          </p>
        </div>

        {/* ProjectCreationForm (Only visible to admin) */}
        {isAdmin && (
          <form onSubmit={handleCreateProject} className="glass-card p-4 rounded-2xl flex flex-col sm:flex-row items-center gap-4 shadow-sm w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                add_task
              </span>
              <input
                type="text"
                placeholder="New Project Name..."
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full bg-white/50 border border-outline-variant/20 focus:bg-white rounded-xl text-sm transition-all outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isCreating}
              className="premium-gradient text-white px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:shadow-lg active:scale-95 transition-all shadow-md w-full sm:w-auto justify-center cursor-pointer disabled:opacity-75"
            >
              <span>Create</span>
              <span className="material-symbols-outlined text-sm">rocket_launch</span>
            </button>
          </form>
        )}
      </header>

      {createError && (
        <div className="mb-6 p-3 rounded-lg bg-error-container text-on-error-container text-xs font-semibold flex items-center gap-2 border border-error/20 max-w-lg">
          <span className="material-symbols-outlined text-[16px] text-error">error</span>
          <span>{createError}</span>
        </div>
      )}

      {/* Bento Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Projects List Table */}
        <section className="lg:col-span-12">
          <div className="glass-card rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/10 bg-white/30">
                  <th className="px-8 py-5 text-xs font-bold text-outline uppercase tracking-wider">Project Details</th>
                  <th className="px-6 py-5 text-xs font-bold text-outline uppercase tracking-wider">Team Allocation</th>
                  <th className="px-6 py-5 text-xs font-bold text-outline uppercase tracking-wider text-right">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {loading ? (
                  <tr>
                    <td colSpan="3" className="px-8 py-6 text-center text-sm text-outline">
                      Loading projects...
                    </td>
                  </tr>
                ) : projects.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="px-8 py-6 text-center text-sm text-outline">
                      No active projects found.
                    </td>
                  </tr>
                ) : (
                  projects.map((proj) => (
                    <tr key={proj.id} className="group hover:bg-white/40 transition-colors duration-200">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl premium-gradient flex items-center justify-center text-white shadow-md shadow-primary/10">
                            <span className="material-symbols-outlined text-[24px]">architecture</span>
                          </div>
                          <div>
                            <p className="font-bold text-on-surface text-sm">{proj.name}</p>
                            <p className="text-[10px] text-outline font-bold">ACTIVE PROJECT</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-2">
                          <div className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                            {proj.member_count} Members Assigned
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleManageTeam(proj)}
                            className="p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                            title="Manage Project Team"
                          >
                            <span className="material-symbols-outlined">groups</span>
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteProject(proj.id, proj.name)}
                              className="p-2 rounded-lg text-error hover:bg-error/10 transition-colors cursor-pointer"
                              title="Delete Project"
                            >
                              <span className="material-symbols-outlined">delete</span>
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


      </div>

      {/* Slide-over Team Manager Drawer */}
      {activeProject && (
        <>
          {/* Overlay */}
          <div
            onClick={() => setActiveProject(null)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60] transition-opacity duration-300"
          />

          {/* Drawer */}
          <div className="fixed top-0 right-0 h-screen w-full max-w-[480px] bg-white/90 backdrop-blur-3xl border-l border-white/40 shadow-[-20px_0_60px_rgba(0,0,0,0.08)] z-[70] transition-transform duration-500 ease-out py-10 px-8 flex flex-col transform translate-x-0">
            <div className="flex justify-between items-start mb-8">
              <div>
                <h3 className="text-xl font-extrabold text-on-surface">Manage Team</h3>
                <p className="text-xs text-outline mt-1 font-bold">Project: {activeProject.name}</p>
              </div>
              <button
                onClick={() => setActiveProject(null)}
                className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Assign Member Dropdown */}
            {isAdmin && (
              <div className="mb-8">
                <label className="block text-[10px] text-outline uppercase tracking-wider font-bold mb-2 ml-0.5">
                  Assign New Member
                </label>
                <form onSubmit={handleAssignMember} className="flex gap-3">
                  <select
                    value={selectedEmpToAssign}
                    onChange={(e) => setSelectedEmpToAssign(e.target.value)}
                    className="flex-1 rounded-xl border border-outline-variant/30 bg-white/50 text-xs focus:ring-primary focus:border-primary px-4 py-2 appearance-none cursor-pointer outline-none"
                  >
                    <option value="">Select employee to assign...</option>
                    {availableEmployeesToAssign.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="w-12 h-12 premium-gradient text-white rounded-xl flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined">person_add</span>
                  </button>
                </form>
                {assignError && (
                  <p className="text-[11px] text-error font-bold mt-2 ml-1">{assignError}</p>
                )}
              </div>
            )}

            {/* Team Members List */}
            <div className="flex-grow overflow-y-auto pr-1">
              <h4 className="text-[10px] text-outline uppercase tracking-wider font-bold mb-4">
                Current Team ({projectMembers.length})
              </h4>
              
              {loadingMembers ? (
                <div className="text-center py-6 text-sm text-outline">Loading members...</div>
              ) : projectMembers.length === 0 ? (
                <div className="text-center py-6 text-xs text-outline italic">No team members assigned yet.</div>
              ) : (
                <div className="space-y-3">
                  {projectMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 rounded-2xl bg-white/40 border border-white/60 group hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          {member.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-bold text-on-surface text-sm">{member.name}</p>
                          <p className="text-[10px] text-outline font-bold">{member.department}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <button
                            onClick={() => handleRemoveMember(member.id, member.name)}
                            className="p-1.5 text-outline hover:text-error transition-colors cursor-pointer"
                            title="Remove Member from Project"
                          >
                            <span className="material-symbols-outlined text-[18px]">person_remove</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
