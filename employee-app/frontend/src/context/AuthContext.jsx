import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in from localStorage
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const username = localStorage.getItem('username');
    const employeeId = localStorage.getItem('employeeId');
    const empId = localStorage.getItem('empId');

    if (token && role && username) {
      setUser({ 
        token, 
        role, 
        username, 
        employeeId: employeeId ? parseInt(employeeId) : null,
        empId: empId || null
      });
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Authentication failed');
      }

      // Store in localStorage
      localStorage.setItem('token', data.token);
      localStorage.setItem('role', data.role);
      localStorage.setItem('username', username);
      if (data.employee_id !== null && data.employee_id !== undefined) {
        localStorage.setItem('employeeId', data.employee_id);
      } else {
        localStorage.removeItem('employeeId');
      }
      if (data.emp_id) {
        localStorage.setItem('empId', data.emp_id);
      } else {
        localStorage.removeItem('empId');
      }

      setUser({
        token: data.token,
        role: data.role,
        username,
        employeeId: data.employee_id,
        empId: data.emp_id || null
      });

      return { success: true, role: data.role };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    localStorage.removeItem('employeeId');
    localStorage.removeItem('empId');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
