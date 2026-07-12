import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Plus, SlidersHorizontal, Tag, RefreshCw,
  ChevronDown, X, Box, AlertTriangle, CheckCircle2,
  Clock, MapPin, Hash, Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_STYLES = {
  'Available':        { pill: 'bg-emerald-500/12 text-emerald-400 border-emerald-500/25', dot: 'bg-emerald-400' },
  'Allocated':        { pill: 'bg-violet-500/12  text-violet-400  border-violet-500/25',  dot: 'bg-violet-400'  },
  'Reserved':         { pill: 'bg-cyan-500/12    text-cyan-400    border-cyan-500/25',    dot: 'bg-cyan-400'    },
  'Under Maintenance':{ pill: 'bg-amber-500/12   text-amber-400   border-amber-500/25',   dot: 'bg-amber-400'   },
  'Lost':             { pill: 'bg-rose-500/12    text-rose-400    border-rose-500/25',    dot: 'bg-rose-400'    },
  'Retired':          { pill: 'bg-slate-500/12   text-slate-400   border-slate-500/25',   dot: 'bg-slate-400'   },
  'Disposed':         { pill: 'bg-zinc-500/12    text-zinc-400    border-zinc-500/25',    dot: 'bg-zinc-400'    },
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
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150
          ${active
            ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
            : 'bg-slate-900/50 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-200'}`}
      >
        {label}
        {active ? (
          <span className="max-w-[80px] truncate text-indigo-200">{value}</span>
        ) : null}
        {active
          ? <X className="w-3 h-3 cursor-pointer" onClick={e => { e.stopPropagation(); onClear(); setOpen(false); }} />
          : <ChevronDown className="w-3 h-3" />}
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 left-0 z-50 min-w-[160px] glass-card rounded-xl py-1 shadow-2xl border border-white/10">
          {options.map(opt => (
            <button key={opt} onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs transition-colors
                ${value === opt ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-300 hover:bg-white/5'}`}>
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── RegisterAssetModal ─────────────────────────────────────────────────────────
function RegisterAssetModal({ onClose, onRegistered }) {
  const { token } = useAuth();
  const [form, setForm] = useState({
    name: '', serial_number: '', category_id: '',
    department_id: '', acquisition_cost: '', condition: 'New',
    location: '', is_bookable: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  // Quick static lists — in a real app these come from /api/categories, /api/departments
  const categories  = [{ id: 1, name: 'Computing' }, { id: 2, name: 'Mobile Devices' }, { id: 3, name: 'Networking' }, { id: 4, name: 'Displays' }, { id: 5, name: 'Furniture' }];
  const departments = [{ id: 1, name: 'Engineering' }, { id: 2, name: 'IT Operations' }, { id: 3, name: 'Design' }, { id: 4, name: 'Sales' }, { id: 5, name: 'Operations' }];

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.serial_number || !form.category_id) {
      setError('Name, serial number and category are required.'); return;
    }
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-lg glass-card rounded-2xl p-7 shadow-2xl animate-[fadeIn_0.25s_ease-out] border border-white/10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/15 rounded-xl border border-indigo-500/25">
              <Box className="w-4 h-4 text-indigo-400" />
            </div>
            <h2 className="text-base font-bold text-white font-display">Register New Asset</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Asset Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                placeholder="e.g. MacBook Pro 16&quot;" required
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/40 transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Serial Number *</label>
              <input value={form.serial_number} onChange={e => set('serial_number', e.target.value)}
                placeholder="SN-XXXX" required
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/40 transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Category *</label>
              <select value={form.category_id} onChange={e => set('category_id', e.target.value)} required
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-100
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition-all">
                <option value="">Select…</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Department</label>
              <select value={form.department_id} onChange={e => set('department_id', e.target.value)}
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-100
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition-all">
                <option value="">None</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Location</label>
              <input value={form.location} onChange={e => set('location', e.target.value)}
                placeholder="e.g. Office Floor 3"
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition-all" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Condition</label>
              <select value={form.condition} onChange={e => set('condition', e.target.value)}
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-100
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition-all">
                {['New', 'Good', 'Fair', 'Poor'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2 space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Acquisition Cost ($)</label>
              <input type="number" value={form.acquisition_cost} onChange={e => set('acquisition_cost', e.target.value)}
                placeholder="0.00" min="0" step="0.01"
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600
                           focus:outline-none focus:ring-2 focus:ring-indigo-500/60 transition-all" />
            </div>
            <div className="col-span-2 flex items-center gap-2.5">
              <input type="checkbox" id="bookable" checked={form.is_bookable} onChange={e => set('is_bookable', e.target.checked)}
                className="w-4 h-4 rounded accent-indigo-500" />
              <label htmlFor="bookable" className="text-xs text-slate-400 cursor-pointer">This asset is bookable by employees</label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-400 border border-white/10 hover:bg-white/5 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white
                         bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500
                         disabled:opacity-50 shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98]">
              {loading
                ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Registering…</span>
                : 'Register Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main AssetsPage ────────────────────────────────────────────────────────────
const STATUSES    = ['Available', 'Allocated', 'Reserved', 'Under Maintenance', 'Lost', 'Retired', 'Disposed'];
const CATEGORIES  = ['Computing', 'Mobile Devices', 'Networking', 'Displays', 'Furniture'];
const DEPARTMENTS = ['Engineering', 'IT Operations', 'Design', 'Sales', 'Operations'];

export default function AssetsPage() {
  const { token } = useAuth();

  const [assets, setAssets]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [catFilter, setCatFilter]   = useState('');
  const [statFilter, setStatFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [showModal, setShowModal]   = useState(false);

  // Debounced search — fire 350ms after user stops typing
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchAssets = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (catFilter)       params.set('category', CATEGORIES.indexOf(catFilter) + 1); // map name→id
      if (statFilter)      params.set('status', statFilter);
      if (deptFilter)      params.set('department', DEPARTMENTS.indexOf(deptFilter) + 1);

      const res  = await fetch(`/api/assets?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load assets.');
      setAssets(data.assets || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, catFilter, statFilter, deptFilter, token]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const handleRegistered = (newAsset) => {
    setAssets(prev => [newAsset, ...prev]);
  };

  const activeFilterCount = [catFilter, statFilter, deptFilter].filter(Boolean).length;

  return (
    <div className="space-y-5 animate-[fadeIn_0.3s_ease-out]">

      {/* ── Header row ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white font-display tracking-tight">Asset Registry</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {loading ? 'Loading…' : `${assets.length} asset${assets.length !== 1 ? 's' : ''} found`}
          </p>
        </div>
        <div className="sm:ml-auto flex items-center gap-2 flex-wrap">
          <button onClick={fetchAssets} title="Refresh"
            className="p-2 rounded-xl border border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white
                       bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500
                       shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98]">
            <Plus className="w-4 h-4" />
            Register Asset
          </button>
        </div>
      </div>

      {/* ── Search + Filters row ───────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Search bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by tag, serial, or name…"
            className="w-full bg-slate-900/60 border border-white/10 rounded-xl pl-10 pr-9 py-2.5 text-sm text-slate-100
                       placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/60
                       focus:border-indigo-500/40 transition-all"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {activeFilterCount > 0 && <span className="text-indigo-400 font-bold">{activeFilterCount}</span>}
          </span>
          <FilterPill label="Category"   value={catFilter}  options={CATEGORIES}  onChange={setCatFilter}  onClear={() => setCatFilter('')}  />
          <FilterPill label="Status"     value={statFilter} options={STATUSES}     onChange={setStatFilter} onClear={() => setStatFilter('')} />
          <FilterPill label="Department" value={deptFilter} options={DEPARTMENTS}  onChange={setDeptFilter} onClear={() => setDeptFilter('')} />
          {activeFilterCount > 0 && (
            <button onClick={() => { setCatFilter(''); setStatFilter(''); setDeptFilter(''); }}
              className="text-xs text-slate-500 hover:text-rose-400 transition-colors flex items-center gap-1">
              <X className="w-3 h-3" /> Clear all
            </button>
          )}
        </div>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {error && (
          <div className="px-6 py-4 bg-rose-500/10 border-b border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error} — <button onClick={fetchAssets} className="underline underline-offset-2">Retry</button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs">
            {/* Header */}
            <thead>
              <tr className="border-b border-white/[0.07] bg-white/[0.02]">
                {[
                  { icon: <Tag className="w-3 h-3" />,          label: 'Tag'        },
                  { icon: <Box className="w-3 h-3" />,          label: 'Asset'      },
                  { icon: <Hash className="w-3 h-3" />,         label: 'Serial'     },
                  { icon: null,                                  label: 'Category'   },
                  { icon: <CheckCircle2 className="w-3 h-3" />, label: 'Status'     },
                  { icon: <MapPin className="w-3 h-3" />,       label: 'Location'   },
                  { icon: <Clock className="w-3 h-3" />,        label: 'Added'      },
                ].map(col => (
                  <th key={col.label}
                    className="px-5 py-3.5 text-left text-[9px] font-bold uppercase tracking-widest text-slate-500">
                    <span className="flex items-center gap-1.5">
                      {col.icon && <span className="text-slate-600">{col.icon}</span>}
                      {col.label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                // Skeleton rows
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(7)].map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className={`h-3 bg-white/[0.05] rounded-full ${j === 1 ? 'w-32' : 'w-16'}`} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-600">
                      <Box className="w-10 h-10 opacity-30" />
                      <p className="text-sm font-medium text-slate-500">No assets found</p>
                      <p className="text-xs">Try adjusting your search or filters, or register a new asset.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                assets.map(asset => (
                  <tr key={asset.id}
                    className="group hover:bg-white/[0.025] transition-colors cursor-pointer">
                    {/* Tag */}
                    <td className="px-5 py-4">
                      <span className="font-mono text-indigo-400 font-bold text-[11px] tracking-wider
                                       bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-lg">
                        {asset.asset_tag || '—'}
                      </span>
                    </td>
                    {/* Name */}
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-200 group-hover:text-white transition-colors">{asset.name}</p>
                      {asset.department_name && (
                        <p className="text-[10px] text-slate-600 mt-0.5">{asset.department_name}</p>
                      )}
                    </td>
                    {/* Serial */}
                    <td className="px-5 py-4 font-mono text-slate-500 text-[10px]">{asset.serial_number}</td>
                    {/* Category */}
                    <td className="px-5 py-4 text-slate-400">{asset.category_name || '—'}</td>
                    {/* Status */}
                    <td className="px-5 py-4">
                      <StatusPill status={asset.status} />
                    </td>
                    {/* Location */}
                    <td className="px-5 py-4 text-slate-500 max-w-[120px] truncate">
                      {asset.location || <span className="text-slate-700">—</span>}
                    </td>
                    {/* Added */}
                    <td className="px-5 py-4 text-slate-600 whitespace-nowrap">
                      {asset.created_at
                        ? new Date(asset.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer count bar */}
        {!loading && assets.length > 0 && (
          <div className="px-5 py-3 border-t border-white/[0.04] flex items-center justify-between bg-white/[0.01]">
            <span className="text-[10px] text-slate-600">
              Showing {assets.length} result{assets.length !== 1 ? 's' : ''}
              {(catFilter || statFilter || deptFilter || debouncedSearch) ? ' (filtered)' : ''}
            </span>
            <div className="flex items-center gap-3 text-[10px] text-slate-700">
              {Object.entries(
                assets.reduce((acc, a) => { acc[a.status] = (acc[a.status] || 0) + 1; return acc; }, {})
              ).slice(0, 3).map(([st, count]) => (
                <span key={st}>{st}: <strong className="text-slate-500">{count}</strong></span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Register Modal */}
      {showModal && (
        <RegisterAssetModal onClose={() => setShowModal(false)} onRegistered={handleRegistered} />
      )}
    </div>
  );
}
