import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2, Users, FolderOpen, Plus, Edit2, CheckCircle2, XCircle, AlertCircle, X, Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function OrgSetupPage() {
  const { token } = useAuth();
  
  const [activeTab, setActiveTab] = useState('departments'); // 'departments' | 'categories' | 'employees'
  
  // Departments state
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null); // null for Add, dept object for Edit
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [managerId, setManagerId] = useState('');
  const [parentId, setParentId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch departments
  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/departments', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch departments.');
      const data = await res.json();
      setDepartments(data.departments || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Fetch employees
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/departments/employees', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch employees.');
      const data = await res.json();
      setEmployees(data.employees || []);
    } catch (err) {
      console.error(err.message);
    }
  }, [token]);

  useEffect(() => {
    fetchDepartments();
    fetchEmployees();
  }, [fetchDepartments, fetchEmployees]);

  const openAddModal = () => {
    setEditingDept(null);
    setName('');
    setCode('');
    setManagerId('');
    setParentId('');
    setIsActive(true);
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const openEditModal = (dept) => {
    setEditingDept(dept);
    setName(dept.name);
    setCode(dept.code);
    setManagerId(dept.manager_id ? dept.manager_id.toString() : '');
    setParentId(dept.parent_id ? dept.parent_id.toString() : '');
    setIsActive(dept.is_active);
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const handleSaveDepartment = async (e) => {
    e.preventDefault();
    if (!name || !code) {
      setError('Name and Code are required.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');

    const payload = {
      name,
      code,
      manager_id: managerId ? Number(managerId) : null,
      parent_id: parentId ? Number(parentId) : null,
      is_active: isActive
    };

    try {
      const url = editingDept ? `/api/departments/${editingDept.id}` : '/api/departments';
      const method = editingDept ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save department.');

      setSuccess(editingDept ? 'Department updated successfully.' : 'Department created successfully.');
      setShowModal(false);
      fetchDepartments();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-violet-900 font-display tracking-tight">Organization Setup</h2>
          <p className="text-xs text-slate-500 mt-0.5">Manage departments, categories, and organizational employees</p>
        </div>
        {activeTab === 'departments' && (
          <button
            onClick={openAddModal}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-md shadow-violet-200 transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Add Department
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-violet-100 gap-1">
        {[
          { key: 'departments', icon: <Building2 className="w-4 h-4" />, label: 'Departments' },
          { key: 'categories', icon: <FolderOpen className="w-4 h-4" />, label: 'Categories' },
          { key: 'employees', icon: <Users className="w-4 h-4" />, label: 'Employees' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 text-xs font-semibold border-b-2 transition-all -mb-px
              ${activeTab === tab.key
                ? 'border-violet-600 text-violet-700 bg-violet-50/20'
                : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Banners */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* ── Tab: Departments ── */}
      {activeTab === 'departments' && (
        <div className="bg-white border border-violet-100 rounded-2xl overflow-hidden shadow-sm shadow-violet-100">
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-left">
              <thead>
                <tr className="border-b border-violet-100 bg-violet-50/50">
                  <th className="px-5 py-3.5 text-[9px] font-bold uppercase tracking-widest text-violet-400">Department</th>
                  <th className="px-5 py-3.5 text-[9px] font-bold uppercase tracking-widest text-violet-400">Head / Manager</th>
                  <th className="px-5 py-3.5 text-[9px] font-bold uppercase tracking-widest text-violet-400">Parent Dept</th>
                  <th className="px-5 py-3.5 text-[9px] font-bold uppercase tracking-widest text-violet-400">Status</th>
                  <th className="px-5 py-3.5 text-[9px] font-bold uppercase tracking-widest text-violet-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-50">
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {[...Array(5)].map((_, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-3.5 bg-violet-100 rounded w-24" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : departments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                      No departments configured. Add one to begin.
                    </td>
                  </tr>
                ) : (
                  departments.map(dept => (
                    <tr key={dept.id} className="hover:bg-violet-50/20 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-violet-900">{dept.name}</p>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-0.5 block">
                          Code: {dept.code}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {dept.manager_name ? (
                          <div>
                            <p className="font-medium text-slate-700">{dept.manager_name}</p>
                            <p className="text-[10px] text-slate-400">{dept.manager_email}</p>
                          </div>
                        ) : (
                          <span className="text-slate-300 italic">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-500">
                        {dept.parent_name || <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border
                          ${dept.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${dept.is_active ? 'bg-emerald-505 bg-emerald-500' : 'bg-slate-400'}`} />
                          {dept.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => openEditModal(dept)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-all inline-flex items-center"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab: Categories ── */}
      {activeTab === 'categories' && (
        <div className="bg-white border border-violet-100 rounded-2xl p-6 shadow-sm shadow-violet-100 text-center space-y-2">
          <FolderOpen className="w-8 h-8 text-violet-300 mx-auto" />
          <h3 className="text-sm font-semibold text-violet-950">Categories Configuration</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Standard asset categories (Computing, Mobile Devices, Furniture) are configured dynamically inside the Asset registry system.
          </p>
        </div>
      )}

      {/* ── Tab: Employees ── */}
      {activeTab === 'employees' && (
        <div className="bg-white border border-violet-100 rounded-2xl p-6 shadow-sm shadow-violet-100 text-center space-y-2">
          <Users className="w-8 h-8 text-violet-300 mx-auto" />
          <h3 className="text-sm font-semibold text-violet-950">Employee Directory</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Employees create accounts via sign-up and are assigned roles or departments by system administrators.
          </p>
        </div>
      )}

      {/* ── Add / Edit Department Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(109,40,217,0.10)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-violet-100 animate-[fadeIn_0.25s_ease-out]">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-violet-100 rounded-xl">
                  <Building2 className="w-4 h-4 text-violet-600" />
                </div>
                <h3 className="text-base font-bold text-violet-900 font-display">
                  {editingDept ? 'Edit Department' : 'Add Department'}
                </h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-violet-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDepartment} className="space-y-4">
              {/* Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Department Name</label>
                <input
                  type="text"
                  placeholder="e.g. Research & Development"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  className="w-full bg-violet-50 border border-violet-200 rounded-xl px-3 py-2.5 text-sm text-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-400/50"
                />
              </div>

              {/* Code */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Code</label>
                <input
                  type="text"
                  placeholder="e.g. RND"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  required
                  disabled={!!editingDept} // disabled on edit to prevent code changes
                  className="w-full bg-violet-50 border border-violet-200 rounded-xl px-3 py-2.5 text-sm text-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-400/50 uppercase disabled:opacity-50"
                />
              </div>

              {/* Head / Manager Dropdown */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Head / Manager</label>
                <select
                  value={managerId}
                  onChange={e => setManagerId(e.target.value)}
                  className="w-full bg-violet-50 border border-violet-200 rounded-xl px-3 py-2.5 text-sm text-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-400/50"
                >
                  <option value="">None / Unassigned</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                  ))}
                </select>
              </div>

              {/* Parent Department */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Parent Department</label>
                <select
                  value={parentId}
                  onChange={e => setParentId(e.target.value)}
                  className="w-full bg-violet-50 border border-violet-200 rounded-xl px-3 py-2.5 text-sm text-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-400/50"
                >
                  <option value="">None</option>
                  {departments
                    .filter(d => !editingDept || d.id !== editingDept.id) // hide self from parent options
                    .map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between p-3 bg-violet-50 rounded-xl border border-violet-100">
                <span className="text-xs font-semibold text-violet-950">Active Status</span>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`w-11 h-6 rounded-full transition-all duration-200 focus:outline-none relative ${isActive ? 'bg-violet-600' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow-md transition-all duration-200 ${isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-500 border border-violet-200 hover:bg-violet-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-md shadow-violet-200 transition-all active:scale-[0.98]"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
