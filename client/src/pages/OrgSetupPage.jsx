import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2, Users, FolderOpen, Plus, Edit2, CheckCircle2, XCircle, AlertCircle, X, Loader2, Award, UserCheck, ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function OrgSetupPage() {
  const { token, user } = useAuth();
  
  const [activeTab, setActiveTab] = useState('departments'); // 'departments' | 'categories' | 'employees'
  
  // Shared Loader / Feedback state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  // ─── DEPARTMENTS TAB STATE ───
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [managerId, setManagerId] = useState('');
  const [parentId, setParentId] = useState('');
  const [isActive, setIsActive] = useState(true);

  // ─── CATEGORIES TAB STATE ───
  const [categories, setCategories] = useState([]);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [warrantyPeriod, setWarrantyPeriod] = useState('');

  // ─── EMPLOYEES TAB STATE ───
  const [employeesList, setEmployeesList] = useState([]);
  const [promotingEmp, setPromotingEmp] = useState(null);
  const [targetRole, setTargetRole] = useState('');

  // Fetch departments
  const fetchDepartments = useCallback(async () => {
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
    }
  }, [token]);

  // Fetch legacy employees for Head dropdown
  const fetchEmployeesList = useCallback(async () => {
    try {
      const res = await fetch('/api/departments/employees', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch employees dropdown.');
      const data = await res.json();
      setEmployees(data.employees || []);
    } catch (err) {
      console.error(err.message);
    }
  }, [token]);

  // Fetch full directory for Directory Tab
  const fetchDirectory = useCallback(async () => {
    setError('');
    try {
      const res = await fetch('/api/employees', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch employees directory.');
      const data = await res.json();
      setEmployeesList(data.employees || []);
    } catch (err) {
      setError(err.message);
    }
  }, [token]);

  // Fetch Categories
  const fetchCategories = useCallback(async () => {
    setError('');
    try {
      const res = await fetch('/api/categories', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch categories.');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (err) {
      setError(err.message);
    }
  }, [token]);

  // Global loading triggers
  const loadTabData = useCallback(async () => {
    setLoading(true);
    if (activeTab === 'departments') {
      await Promise.all([fetchDepartments(), fetchEmployeesList()]);
    } else if (activeTab === 'categories') {
      await fetchCategories();
    } else if (activeTab === 'employees') {
      await fetchDirectory();
    }
    setLoading(false);
  }, [activeTab, fetchDepartments, fetchEmployeesList, fetchCategories, fetchDirectory]);

  useEffect(() => {
    loadTabData();
  }, [loadTabData]);

  // ─── DEPARTMENTS ACTIONS ───
  const openAddDept = () => {
    setEditingDept(null);
    setDeptName('');
    setDeptCode('');
    setManagerId('');
    setParentId('');
    setIsActive(true);
    setError('');
    setSuccess('');
    setShowDeptModal(true);
  };

  const openEditDept = (dept) => {
    setEditingDept(dept);
    setDeptName(dept.name);
    setDeptCode(dept.code);
    setManagerId(dept.manager_id ? dept.manager_id.toString() : '');
    setParentId(dept.parent_id ? dept.parent_id.toString() : '');
    setIsActive(dept.is_active);
    setError('');
    setSuccess('');
    setShowDeptModal(true);
  };

  const handleSaveDept = async (e) => {
    e.preventDefault();
    if (!deptName || !deptCode) {
      setError('Name and Code are required.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');

    const payload = {
      name: deptName,
      code: deptCode,
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
      setShowDeptModal(false);
      await fetchDepartments();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── CATEGORIES ACTIONS ───
  const openAddCat = () => {
    setEditingCat(null);
    setCatName('');
    setCatDesc('');
    setWarrantyPeriod('');
    setError('');
    setSuccess('');
    setShowCatModal(true);
  };

  const openEditCat = (cat) => {
    setEditingCat(cat);
    setCatName(cat.name);
    setCatDesc(cat.description || '');
    setWarrantyPeriod(cat.fields?.warranty_period || '');
    setError('');
    setSuccess('');
    setShowCatModal(true);
  };

  const handleSaveCat = async (e) => {
    e.preventDefault();
    if (!catName) {
      setError('Category name is required.');
      return;
    }
    setSaving(true);
    setError('');
    setSuccess('');

    const payload = {
      name: catName,
      description: catDesc,
      fields: warrantyPeriod ? { warranty_period: warrantyPeriod } : null
    };

    try {
      const url = editingCat ? `/api/categories/${editingCat.id}` : '/api/categories';
      const method = editingCat ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save category.');

      setSuccess(editingCat ? 'Category updated successfully.' : 'Category created successfully.');
      setShowCatModal(false);
      await fetchCategories();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── EMPLOYEE PROMOTION ACTIONS ───
  const openPromoteModal = (emp) => {
    setPromotingEmp(emp);
    setTargetRole(emp.role);
    setError('');
    setSuccess('');
  };

  const handlePromoteRole = async (e) => {
    e.preventDefault();
    if (!promotingEmp) return;
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/employees/${promotingEmp.id}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role: targetRole })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to promote employee.');

      setSuccess(`Successfully updated role of ${promotingEmp.name} to ${targetRole}.`);
      setPromotingEmp(null);
      await fetchDirectory();
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
          <p className="text-xs text-slate-500 mt-0.5">Manage departments, categories, and employee privilege levels</p>
        </div>
        {activeTab === 'departments' && (
          <button
            onClick={openAddDept}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-md shadow-violet-200 transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Add Department
          </button>
        )}
        {activeTab === 'categories' && (
          <button
            onClick={openAddCat}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-md shadow-violet-200 transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-violet-100 gap-1">
        {[
          { key: 'departments', icon: <Building2 className="w-4 h-4" />, label: 'Departments' },
          { key: 'categories', icon: <FolderOpen className="w-4 h-4" />, label: 'Categories' },
          { key: 'employees', icon: <Users className="w-4 h-4" />, label: 'Employees Directory' }
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

      {/* ── Tab 1: Departments ── */}
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
                  [...Array(3)].map((_, i) => (
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
                          <span className={`w-1.5 h-1.5 rounded-full ${dept.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {dept.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => openEditDept(dept)}
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

      {/* ─── Tab 2: Categories ─── */}
      {activeTab === 'categories' && (
        <div className="bg-white border border-violet-100 rounded-2xl overflow-hidden shadow-sm shadow-violet-100">
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-left">
              <thead>
                <tr className="border-b border-violet-100 bg-violet-50/50">
                  <th className="px-5 py-3.5 text-[9px] font-bold uppercase tracking-widest text-violet-400">Category Name</th>
                  <th className="px-5 py-3.5 text-[9px] font-bold uppercase tracking-widest text-violet-400">Description</th>
                  <th className="px-5 py-3.5 text-[9px] font-bold uppercase tracking-widest text-violet-400">Custom Attributes (JSONB)</th>
                  <th className="px-5 py-3.5 text-[9px] font-bold uppercase tracking-widest text-violet-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-violet-50">
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {[...Array(4)].map((_, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-3.5 bg-violet-100 rounded w-24" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-12 text-center text-slate-400">
                      No categories found.
                    </td>
                  </tr>
                ) : (
                  categories.map(cat => (
                    <tr key={cat.id} className="hover:bg-violet-50/20 transition-colors">
                      <td className="px-5 py-4 font-semibold text-violet-900">{cat.name}</td>
                      <td className="px-5 py-4 text-slate-500 max-w-[200px] truncate" title={cat.description || ''}>
                        {cat.description || <span className="text-slate-300 italic">No description</span>}
                      </td>
                      <td className="px-5 py-4">
                        {cat.fields && Object.keys(cat.fields).length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(cat.fields).map(([key, val]) => (
                              <span key={key} className="bg-violet-50 border border-violet-150 text-[10px] text-violet-700 px-2 py-0.5 rounded-lg font-medium">
                                <strong className="font-semibold uppercase tracking-tight text-[9px] text-violet-400 mr-1">{key}:</strong>
                                {String(val)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-300 italic">No attributes configured</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => openEditCat(cat)}
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

      {/* ─── Tab 3: Employees Directory ─── */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          {/* Security Notice Banner */}
          <div className="flex items-start gap-3 rounded-2xl bg-amber-50/80 border border-amber-200 p-4">
            <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wide">Security Enforcement Protocol</h4>
              <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                Roles and privilege levels are strictly managed. Employees who register via sign-up default to simple basic roles. Administrators must assign operational roles (such as Department Head or Asset Manager) manually through this dashboard.
              </p>
            </div>
          </div>

          <div className="bg-white border border-violet-100 rounded-2xl overflow-hidden shadow-sm shadow-violet-100">
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-violet-100 bg-violet-50/50">
                    <th className="px-5 py-3.5 text-[9px] font-bold uppercase tracking-widest text-violet-400">Employee Details</th>
                    <th className="px-5 py-3.5 text-[9px] font-bold uppercase tracking-widest text-violet-400">Department</th>
                    <th className="px-5 py-3.5 text-[9px] font-bold uppercase tracking-widest text-violet-400">System Role</th>
                    <th className="px-5 py-3.5 text-[9px] font-bold uppercase tracking-widest text-violet-400">Account Status</th>
                    <th className="px-5 py-3.5 text-[9px] font-bold uppercase tracking-widest text-violet-400 text-right">Access Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-violet-50">
                  {loading ? (
                    [...Array(3)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        {[...Array(5)].map((_, j) => (
                          <td key={j} className="px-5 py-4">
                            <div className="h-3.5 bg-violet-100 rounded w-24" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : employeesList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                        No employees found.
                      </td>
                    </tr>
                  ) : (
                    employeesList.map(emp => (
                      <tr key={emp.id} className="hover:bg-violet-50/20 transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-violet-900">{emp.name}</p>
                          <p className="text-[10px] text-slate-400">{emp.email}</p>
                        </td>
                        <td className="px-5 py-4 text-slate-500">
                          {emp.department_name || <span className="text-slate-300 italic">No department assigned</span>}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider
                            ${emp.role === 'Admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                              emp.role === 'Manager' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              'bg-slate-50 text-slate-600 border-slate-200'}`}>
                            {emp.role}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide border
                            ${emp.is_active !== false ? 'bg-emerald-50 text-emerald-700 border-emerald-250' : 'bg-red-50 text-red-700 border-red-200'}`}>
                            {emp.is_active !== false ? 'Active' : 'Deactivated'}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => openPromoteModal(emp)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold text-violet-700 border border-violet-200 hover:bg-violet-50 transition-all ml-auto active:scale-95 bg-white"
                          >
                            <Award className="w-3.5 h-3.5" />
                            Manage Role
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── ADD/EDIT DEPARTMENT MODAL ─── */}
      {showDeptModal && (
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
              <button onClick={() => setShowDeptModal(false)} className="text-slate-400 hover:text-violet-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDept} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Department Name</label>
                <input
                  type="text"
                  placeholder="e.g. Research & Development"
                  value={deptName}
                  onChange={e => setDeptName(e.target.value)}
                  required
                  className="w-full bg-violet-50 border border-violet-200 rounded-xl px-3 py-2.5 text-sm text-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-400/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Code</label>
                <input
                  type="text"
                  placeholder="e.g. RND"
                  value={deptCode}
                  onChange={e => setDeptCode(e.target.value)}
                  required
                  disabled={!!editingDept}
                  className="w-full bg-violet-50 border border-violet-200 rounded-xl px-3 py-2.5 text-sm text-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-400/50 uppercase disabled:opacity-50"
                />
              </div>

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

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Parent Department</label>
                <select
                  value={parentId}
                  onChange={e => setParentId(e.target.value)}
                  className="w-full bg-violet-50 border border-violet-200 rounded-xl px-3 py-2.5 text-sm text-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-400/50"
                >
                  <option value="">None</option>
                  {departments
                    .filter(d => !editingDept || d.id !== editingDept.id)
                    .map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
              </div>

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
                  onClick={() => setShowDeptModal(false)}
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

      {/* ─── ADD/EDIT CATEGORY MODAL ─── */}
      {showCatModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(109,40,217,0.10)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-violet-100 animate-[fadeIn_0.25s_ease-out]">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-violet-100 rounded-xl">
                  <FolderOpen className="w-4 h-4 text-violet-600" />
                </div>
                <h3 className="text-base font-bold text-violet-900 font-display">
                  {editingCat ? 'Edit Category' : 'Add Category'}
                </h3>
              </div>
              <button onClick={() => setShowCatModal(false)} className="text-slate-400 hover:text-violet-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCat} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Category Name</label>
                <input
                  type="text"
                  placeholder="e.g. Workstations"
                  value={catName}
                  onChange={e => setCatName(e.target.value)}
                  required
                  className="w-full bg-violet-50 border border-violet-200 rounded-xl px-3 py-2.5 text-sm text-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-400/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Description</label>
                <textarea
                  placeholder="Describe category asset scope…"
                  value={catDesc}
                  onChange={e => setCatDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-violet-50 border border-violet-200 rounded-xl px-3 py-2.5 text-sm text-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-400/50"
                />
              </div>

              {/* Category attributes warranty config */}
              <div className="space-y-1 border border-violet-100 p-3 bg-violet-50/50 rounded-xl">
                <label className="text-[10px] font-bold uppercase tracking-widest text-violet-500 block mb-1">
                  Custom Properties (JSONB fields)
                </label>
                <p className="text-[10px] text-slate-400 mb-2">Configure custom category metadata stored in dynamic JSONB fields</p>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase text-slate-500">Warranty Period</label>
                  <input
                    type="text"
                    placeholder="e.g. 24 Months"
                    value={warrantyPeriod}
                    onChange={e => setWarrantyPeriod(e.target.value)}
                    className="w-full bg-white border border-violet-200 rounded-xl px-3 py-2 text-xs text-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-400/50"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCatModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-500 border border-violet-200 hover:bg-violet-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-md shadow-violet-200 transition-all active:scale-[0.98]"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── PROMOTE ROLE MODAL ─── */}
      {promotingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(109,40,217,0.10)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl border border-violet-100 animate-[fadeIn_0.25s_ease-out]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-violet-900">
                <Award className="w-5 h-5 text-violet-600" />
                <h3 className="text-base font-bold font-display">Manage Access Control</h3>
              </div>
              <button onClick={() => setPromotingEmp(null)} className="text-slate-400 hover:text-violet-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePromoteRole} className="space-y-4">
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 text-[11px] text-amber-700 leading-relaxed">
                <strong>Policy Warning:</strong> Promotion defines privilege bounds immediately. Modifying roles here dictates system access rights across Asset Allocations and Compliance logs.
              </div>

              <p className="text-xs text-slate-500">
                Update system access role for <strong className="text-slate-700">{promotingEmp.name}</strong> ({promotingEmp.email}):
              </p>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Privilege Role</label>
                <select
                  value={targetRole}
                  onChange={e => setTargetRole(e.target.value)}
                  className="w-full bg-violet-50 border border-violet-200 rounded-xl px-3 py-2.5 text-sm text-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-400/50"
                >
                  <option value="Employee">Employee (Basic Access)</option>
                  <option value="Manager">Manager (Department Head)</option>
                  <option value="Admin">Admin (Asset Manager)</option>
                  <option value="Auditor">Auditor (Compliance Auditor)</option>
                  <option value="Finance">Finance (Procurement/ledger)</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPromotingEmp(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-500 border border-violet-200 hover:bg-violet-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-md shadow-violet-200 transition-all active:scale-[0.98]"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm Privilege Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
