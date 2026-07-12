import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Plus, SlidersHorizontal, Tag, RefreshCw,
  ChevronDown, X, Box, AlertTriangle, CheckCircle2,
  Clock, MapPin, Hash, Loader2, User, Info, FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  'Available':         { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200',  dot: 'bg-emerald-500' },
  'Allocated':         { pill: 'bg-violet-50  text-violet-700  border-violet-200',   dot: 'bg-violet-500'  },
  'Reserved':          { pill: 'bg-blue-50    text-blue-700    border-blue-200',     dot: 'bg-blue-500'    },
  'Under Maintenance': { pill: 'bg-amber-50   text-amber-700   border-amber-200',    dot: 'bg-amber-500'   },
  'Lost':              { pill: 'bg-red-50     text-red-700     border-red-200',      dot: 'bg-red-500'     },
  'Retired':           { pill: 'bg-slate-100  text-slate-600   border-slate-200',    dot: 'bg-slate-400'   },
  'Disposed':          { pill: 'bg-zinc-100   text-zinc-600    border-zinc-200',     dot: 'bg-zinc-400'    },
};

function StatusPill({ status }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES['Available'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${s.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

// ── Filter Pill ────────────────────────────────────────────────────────────────
function FilterPill({ label, value, options, onChange, onClear }) {
  const [open, setOpen] = useState(false);
  const active = !!value;
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150
          ${active
            ? 'bg-violet-100 border-violet-300 text-violet-700'
            : 'bg-white border-violet-200 text-slate-500 hover:border-violet-300 hover:text-violet-700'}`}>
        {label}
        {active && <span className="max-w-[80px] truncate">{value}</span>}
        {active
          ? <X className="w-3 h-3 cursor-pointer" onClick={e => { e.stopPropagation(); onClear(); setOpen(false); }} />
          : <ChevronDown className="w-3 h-3" />}
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 left-0 z-50 min-w-[160px] bg-white rounded-xl py-1 shadow-lg shadow-violet-100 border border-violet-100">
          {options.map(opt => (
            <button key={opt} onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors
                ${value === opt ? 'text-violet-700 bg-violet-50 font-semibold' : 'text-slate-600 hover:bg-violet-50 hover:text-violet-700'}`}>
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Register Asset Modal ───────────────────────────────────────────────────────
function RegisterAssetModal({ onClose, onRegistered }) {
  const { token } = useAuth();
  const [form, setForm] = useState({ name: '', serial_number: '', category_id: '', department_id: '', acquisition_cost: '', condition: 'New', location: '', is_bookable: false });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [departments, setDepartments] = useState([]);

  const categories  = [{ id: 1, name: 'Computing' }, { id: 2, name: 'Mobile Devices' }, { id: 3, name: 'Networking' }, { id: 4, name: 'Displays' }, { id: 5, name: 'Furniture' }];

  useEffect(() => {
    const loadDepts = async () => {
      try {
        const res = await fetch('/api/departments', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setDepartments((data.departments || []).filter(d => d.is_active));
        }
      } catch (err) { console.warn(err.message); }
    };
    loadDepts();
  }, [token]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.serial_number || !form.category_id) { setError('Name, serial and category are required.'); return; }
    setLoading(true); setError('');
    try {
      const res  = await fetch('/api/assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, category_id: Number(form.category_id), department_id: form.department_id ? Number(form.department_id) : null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed.');
      onRegistered(data.asset);
      onClose();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const fieldCls = "w-full bg-violet-50 border border-violet-200 rounded-xl px-3 py-2.5 text-sm text-violet-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400/50 focus:border-violet-400 transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(109,40,217,0.10)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-lg bg-white rounded-2xl p-7 shadow-2xl shadow-violet-200/60 border border-violet-100 animate-[fadeIn_0.25s_ease-out]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-100 rounded-xl border border-violet-200">
              <Box className="w-4 h-4 text-violet-600" />
            </div>
            <h2 className="text-base font-bold text-violet-900 font-display">Register New Asset</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-violet-600 transition-colors"><X className="w-5 h-5" /></button>
        </div>

        {error && <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Asset Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder='e.g. MacBook Pro 16"' required className={fieldCls} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Serial Number *</label>
              <input value={form.serial_number} onChange={e => set('serial_number', e.target.value)} placeholder="SN-XXXX" required className={fieldCls} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Category *</label>
              <select value={form.category_id} onChange={e => set('category_id', e.target.value)} required className={fieldCls}>
                <option value="">Select…</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Department</label>
              <select value={form.department_id} onChange={e => set('department_id', e.target.value)} className={fieldCls}>
                <option value="">None</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Location</label>
              <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Floor 3" className={fieldCls} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Condition</label>
              <select value={form.condition} onChange={e => set('condition', e.target.value)} className={fieldCls}>
                {['New', 'Good', 'Fair', 'Poor'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Acquisition Cost (₹)</label>
              <input type="number" value={form.acquisition_cost} onChange={e => set('acquisition_cost', e.target.value)} placeholder="0.00" min="0" step="0.01" className={fieldCls} />
            </div>
            <div className="col-span-2 flex items-center gap-2.5">
              <input type="checkbox" id="bookable" checked={form.is_bookable} onChange={e => set('is_bookable', e.target.checked)} className="w-4 h-4 rounded accent-violet-600" />
              <label htmlFor="bookable" className="text-xs text-slate-500 cursor-pointer">This asset is bookable by employees</label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-500 border border-violet-200 hover:bg-violet-50 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white
                         bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700
                         disabled:opacity-50 shadow-md shadow-violet-200 transition-all active:scale-[0.98]">
              {loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Registering…</span> : 'Register Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Asset Detail View Modal ──────────────────────────────────────────────────
function AssetDetailModal({ assetId, onClose }) {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('allocation'); // 'allocation' | 'maintenance'

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/assets/${assetId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load asset details.');
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [assetId, token]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-55 flex items-center justify-center px-4"
        style={{ background: 'rgba(109,40,217,0.12)', backdropFilter: 'blur(6px)' }}>
        <div className="w-full max-w-2xl bg-white rounded-2xl p-12 flex justify-center border border-violet-100 shadow-2xl">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 z-55 flex items-center justify-center px-4"
        style={{ background: 'rgba(109,40,217,0.12)', backdropFilter: 'blur(6px)' }}>
        <div className="w-full max-w-md bg-white rounded-2xl p-6 border border-red-100 shadow-2xl space-y-4">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-bold text-sm">Failed to Load Asset</h3>
          </div>
          <p className="text-xs text-slate-500">{error || 'Asset not found'}</p>
          <button onClick={onClose} className="w-full py-2 bg-violet-600 text-white rounded-xl font-semibold text-xs">Close</button>
        </div>
      </div>
    );
  }

  const { asset, allocation_history, maintenance_history } = data;

  return (
    <div className="fixed inset-0 z-55 flex items-center justify-center px-4"
      style={{ background: 'rgba(109,40,217,0.12)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-2xl bg-white rounded-2xl p-6 shadow-2xl border border-violet-100 animate-[fadeIn_0.25s_ease-out] flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-violet-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-violet-600 font-bold text-[11px] tracking-wider bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-lg">
                {asset.asset_tag || '—'}
              </span>
              <h2 className="text-base font-bold text-violet-900 font-display">{asset.name}</h2>
            </div>
            <p className="text-xs text-slate-400">Serial: <span className="font-mono">{asset.serial_number}</span></p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-violet-600 transition-colors"><X className="w-5 h-5" /></button>
        </div>

        {/* Content Body (Scrollable) */}
        <div className="flex-1 overflow-y-auto py-5 space-y-6 pr-1">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 bg-violet-50/30 rounded-2xl p-4 border border-violet-100/50">
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Status</span>
              <div className="mt-1"><StatusPill status={asset.status} /></div>
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Category</span>
              <p className="text-xs font-semibold text-violet-900 mt-0.5">{asset.category_name || '—'}</p>
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Department</span>
              <p className="text-xs font-semibold text-violet-900 mt-0.5">{asset.department_name || '—'}</p>
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Condition</span>
              <p className="text-xs font-semibold text-violet-900 mt-0.5">{asset.condition || '—'}</p>
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Location</span>
              <p className="text-xs font-semibold text-violet-900 mt-0.5">{asset.location || '—'}</p>
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Cost</span>
              <p className="text-xs font-semibold text-violet-900 mt-0.5">{asset.acquisition_cost ? `₹${asset.acquisition_cost}` : '—'}</p>
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Bookable</span>
              <p className="text-xs font-semibold text-violet-900 mt-0.5">{asset.is_bookable ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">Registered At</span>
              <p className="text-xs font-semibold text-violet-900 mt-0.5">
                {asset.created_at ? new Date(asset.created_at).toLocaleDateString() : '—'}
              </p>
            </div>
          </div>

          {/* History Section Tabs */}
          <div className="space-y-4">
            <div className="flex border-b border-violet-100">
              <button
                onClick={() => setActiveTab('allocation')}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all -mb-px
                  ${activeTab === 'allocation'
                    ? 'border-violet-600 text-violet-700'
                    : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Allocation History ({allocation_history?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('maintenance')}
                className={`px-4 py-2 text-xs font-semibold border-b-2 transition-all -mb-px
                  ${activeTab === 'maintenance'
                    ? 'border-violet-600 text-violet-700'
                    : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                Maintenance History ({maintenance_history?.length || 0})
              </button>
            </div>

            {/* Tab Panels */}
            {activeTab === 'allocation' ? (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-violet-100">
                {!allocation_history || allocation_history.length === 0 ? (
                  <div className="flex items-center gap-2 text-slate-400 text-xs italic py-2">
                    <Info className="w-4 h-4 text-violet-300" />
                    <span>No allocation history logged</span>
                  </div>
                ) : (
                  allocation_history.map(item => (
                    <div key={item.id} className="relative text-xs">
                      {/* Circle Bullet */}
                      <span className="absolute -left-[22px] top-1 w-3.5 h-3.5 rounded-full bg-violet-600 border-2 border-white shadow-xs" />
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <p className="font-semibold text-violet-950">Assigned to {item.user_name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{item.user_email}</p>
                          {item.notes && <p className="text-[11px] text-slate-500 mt-1 italic">"{item.notes}"</p>}
                        </div>
                        <div className="text-right">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider
                            ${item.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-slate-100 text-slate-500'}`}>
                            {item.status}
                          </span>
                          <p className="text-[9px] text-slate-400 mt-1">
                            {new Date(item.allocated_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-violet-100">
                {!maintenance_history || maintenance_history.length === 0 ? (
                  <div className="flex items-center gap-2 text-slate-400 text-xs italic py-2">
                    <Info className="w-4 h-4 text-violet-300" />
                    <span>No maintenance history logged</span>
                  </div>
                ) : (
                  maintenance_history.map(item => (
                    <div key={item.id} className="relative text-xs">
                      {/* Circle Bullet */}
                      <span className="absolute -left-[22px] top-1 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white shadow-xs" />
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <p className="font-semibold text-violet-950">{item.description}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Reported by: {item.reported_by_name || 'System'}</p>
                          {item.cost && <p className="text-[10px] font-bold text-violet-600 mt-1">Repair Cost: ₹{item.cost}</p>}
                        </div>
                        <div className="text-right space-y-1">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider
                            ${item.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                            {item.status}
                          </span>
                          <p className="text-[9px] text-slate-400">
                            Sched: {item.scheduled_date ? new Date(item.scheduled_date).toLocaleDateString() : '—'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main AssetsPage ────────────────────────────────────────────────────────────
const STATUSES    = ['Available', 'Allocated', 'Reserved', 'Under Maintenance', 'Lost', 'Retired', 'Disposed'];
const CATEGORIES  = ['Computing', 'Mobile Devices', 'Networking', 'Displays', 'Furniture'];

export default function AssetsPage() {
  const { token } = useAuth();
  const [assets, setAssets]         = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [catFilter, setCatFilter]   = useState('');
  const [statFilter, setStatFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [showModal, setShowModal]   = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState(null);

  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Load active departments list dynamically
  useEffect(() => {
    const loadDepts = async () => {
      try {
        const res = await fetch('/api/departments', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setDepartments(data.departments || []);
        }
      } catch (err) { console.warn(err.message); }
    };
    loadDepts();
  }, [token]);

  const fetchAssets = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (catFilter)       params.set('category', CATEGORIES.indexOf(catFilter) + 1);
      if (statFilter)      params.set('status', statFilter);
      if (deptFilter) {
        const selectedDeptObj = departments.find(d => d.name === deptFilter);
        if (selectedDeptObj) params.set('department', selectedDeptObj.id);
      }
      const res  = await fetch(`/api/assets?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load assets.');
      setAssets(data.assets || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [debouncedSearch, catFilter, statFilter, deptFilter, departments, token]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const activeFilterCount = [catFilter, statFilter, deptFilter].filter(Boolean).length;

  return (
    <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-violet-900 font-display tracking-tight">Asset Registry</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {loading ? 'Loading…' : `${assets.length} asset${assets.length !== 1 ? 's' : ''} found`}
          </p>
        </div>
        <div className="sm:ml-auto flex items-center gap-2 flex-wrap">
          <button onClick={fetchAssets} title="Refresh"
            className="p-2 rounded-xl border border-violet-200 text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-all bg-white shadow-xs">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white
                       bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700
                       shadow-md shadow-violet-200 transition-all active:scale-[0.98]">
            <Plus className="w-4 h-4" />
            Register Asset
          </button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-400" />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by tag, serial, or name…"
            className="w-full bg-white border border-violet-200 rounded-xl pl-10 pr-9 py-2.5 text-sm text-violet-900
                       placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400/50
                       focus:border-violet-400 transition-all shadow-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {activeFilterCount > 0 && <span className="text-violet-600 font-bold">{activeFilterCount}</span>}
          </span>
          <FilterPill label="Category"   value={catFilter}  options={CATEGORIES}  onChange={setCatFilter}  onClear={() => setCatFilter('')}  />
          <FilterPill label="Status"     value={statFilter} options={STATUSES}     onChange={setStatFilter} onClear={() => setStatFilter('')} />
          <FilterPill label="Department" value={deptFilter} options={departments.filter(d => d.is_active).map(d => d.name)}  onChange={setDeptFilter} onClear={() => setDeptFilter('')} />
          {activeFilterCount > 0 && (
            <button onClick={() => { setCatFilter(''); setStatFilter(''); setDeptFilter(''); }}
              className="text-xs text-slate-400 hover:text-rose-500 flex items-center gap-1 transition-colors bg-transparent border-0 cursor-pointer">
              <X className="w-3 h-3" /> Clear all
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-violet-100 rounded-2xl overflow-hidden shadow-sm shadow-violet-100">
        {error && (
          <div className="px-6 py-4 bg-red-50 border-b border-red-100 text-red-600 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
            <button onClick={fetchAssets} className="underline underline-offset-2 ml-1">Retry</button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            <thead>
              <tr className="border-b border-violet-100 bg-violet-50/60">
                {[
                  { icon: <Tag className="w-3 h-3" />,          label: 'Tag'      },
                  { icon: <Box className="w-3 h-3" />,          label: 'Asset'    },
                  { icon: <Hash className="w-3 h-3" />,         label: 'Serial'   },
                  { icon: null,                                  label: 'Category' },
                  { icon: <CheckCircle2 className="w-3 h-3" />, label: 'Status'   },
                  { icon: <MapPin className="w-3 h-3" />,       label: 'Location' },
                  { icon: <Clock className="w-3 h-3" />,        label: 'Added'    },
                ].map(col => (
                  <th key={col.label} className="px-5 py-3.5 text-left text-[9px] font-bold uppercase tracking-widest text-violet-400">
                    <span className="flex items-center gap-1.5">
                      {col.icon && <span className="text-violet-300">{col.icon}</span>}
                      {col.label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-50">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className={`h-3 bg-violet-100 rounded-full ${j === 1 ? 'w-32' : 'w-16'}`} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <Box className="w-10 h-10 opacity-20 text-violet-400" />
                      <p className="text-sm font-medium text-slate-500">No assets found</p>
                      <p className="text-xs">Try adjusting your search or filters, or register a new asset.</p>
                    </div>
                  </td>
                </tr>
              ) : assets.map(asset => (
                <tr key={asset.id} onClick={() => setSelectedAssetId(asset.id)} className="group hover:bg-violet-50/40 transition-colors cursor-pointer">
                  <td className="px-5 py-4">
                    <span className="font-mono text-violet-600 font-bold text-[11px] tracking-wider bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-lg">
                      {asset.asset_tag || '—'}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-violet-900 group-hover:text-violet-700 transition-colors">{asset.name}</p>
                    {asset.department_name && <p className="text-[10px] text-slate-400 mt-0.5">{asset.department_name}</p>}
                  </td>
                  <td className="px-5 py-4 font-mono text-slate-400 text-[10px]">{asset.serial_number}</td>
                  <td className="px-5 py-4 text-slate-500">{asset.category_name || '—'}</td>
                  <td className="px-5 py-4"><StatusPill status={asset.status} /></td>
                  <td className="px-5 py-4 text-slate-400 max-w-[120px] truncate">
                    {asset.location || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-5 py-4 text-slate-400 whitespace-nowrap">
                    {asset.created_at ? new Date(asset.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && assets.length > 0 && (
          <div className="px-5 py-3 border-t border-violet-50 flex items-center justify-between bg-violet-50/30">
            <span className="text-[10px] text-slate-400">
              Showing {assets.length} result{assets.length !== 1 ? 's' : ''}
              {(catFilter || statFilter || deptFilter || debouncedSearch) ? ' (filtered)' : ''}
            </span>
            <div className="flex items-center gap-3 text-[10px] text-slate-400">
              {Object.entries(assets.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {}))
                .slice(0, 3).map(([st, count]) => (
                  <span key={st}>{st}: <strong className="text-violet-600">{count}</strong></span>
              ))}
            </div>
          </div>
        )}
      </div>

      {showModal && <RegisterAssetModal onClose={() => setShowModal(false)} onRegistered={a => setAssets(p => [a, ...p])} />}
      {selectedAssetId && <AssetDetailModal assetId={selectedAssetId} onClose={() => setSelectedAssetId(null)} />}
    </div>
  );
}
