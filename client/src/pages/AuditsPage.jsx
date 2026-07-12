import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, Calendar, Users, CheckCircle, XCircle, AlertTriangle, Clock, RefreshCw, X, Loader2, ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ITEM_STATUS_STYLES = {
  'Pending':  { pill: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
  'Verified': { pill: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  'Missing':  { pill: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  'Damaged':  { pill: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' }
};

export default function AuditsPage() {
  const { token, user } = useAuth();

  const [cycles, setCycles] = useState([]);
  const [selectedCycleId, setSelectedCycleId] = useState('');
  const [cycleDetails, setCycleDetails] = useState(null);
  const [auditors, setAuditors] = useState([]);
  const [auditItems, setAuditItems] = useState([]);

  const [loading, setLoading] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState(null);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals / Notes state
  const [editingItem, setEditingItem] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [targetStatus, setTargetStatus] = useState('');

  // Fetch list of cycles
  const fetchCycles = useCallback(async () => {
    try {
      const res = await fetch('/api/audits', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load audit cycles.');
      const data = await res.json();
      setCycles(data.cycles || []);
      if (data.cycles?.length > 0 && !selectedCycleId) {
        setSelectedCycleId(data.cycles[0].id.toString());
      }
    } catch (err) {
      setError(err.message);
    }
  }, [token, selectedCycleId]);

  useEffect(() => {
    fetchCycles();
  }, [fetchCycles]);

  // Fetch details for the selected cycle
  const fetchCycleData = useCallback(async () => {
    if (!selectedCycleId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/audits/${selectedCycleId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load audit details.');
      const data = await res.json();
      setCycleDetails(data.cycle);
      setAuditors(data.auditors || []);
      setAuditItems(data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedCycleId, token]);

  useEffect(() => {
    fetchCycleData();
  }, [fetchCycleData]);

  // PATCH status for a specific item
  const updateItemStatus = async (itemId, status, notes = '') => {
    setUpdatingItemId(itemId);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/audit-items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status,
          notes: notes || null,
          verified_by: user.id
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update audit item.');

      setSuccess(`Updated asset state successfully.`);
      // Refresh details
      fetchCycleData();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingItemId(null);
    }
  };

  // Close the entire audit cycle
  const closeAuditCycle = async () => {
    if (!selectedCycleId) return;
    setClosing(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`/api/audits/${selectedCycleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'Closed' })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to close audit cycle.');

      setSuccess('Audit cycle closed successfully. All matched assets have been synced.');
      fetchCycles();
      fetchCycleData();
    } catch (err) {
      setError(err.message);
    } finally {
      setClosing(false);
    }
  };

  const handleStatusSelect = (item, newStatus) => {
    if (newStatus === 'Pending') return;
    
    // If Verified, update immediately. If Missing/Damaged, open prompt to add optional note
    if (newStatus === 'Verified') {
      updateItemStatus(item.id, newStatus);
    } else {
      setEditingItem(item);
      setTargetStatus(newStatus);
      setNoteText(item.notes || '');
    }
  };

  const handleSaveNotes = (e) => {
    e.preventDefault();
    if (!editingItem) return;
    updateItemStatus(editingItem.id, targetStatus, noteText);
    setEditingItem(null);
    setNoteText('');
  };

  const getStatusPill = (status) => {
    const s = ITEM_STATUS_STYLES[status] || ITEM_STATUS_STYLES['Pending'];
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${s.pill}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      {/* ── Top Header and Dropdown ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-violet-900 font-display tracking-tight">Compliance & Audits</h2>
          <p className="text-xs text-slate-500 mt-0.5">Review physical asset locations, check for discrepancies, and close audit runs</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedCycleId}
            onChange={e => setSelectedCycleId(e.target.value)}
            className="bg-white border border-violet-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-violet-400/50 shadow-sm"
          >
            {cycles.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.status})
              </option>
            ))}
          </select>
          <button
            onClick={fetchCycleData}
            title="Refresh details"
            className="p-2 rounded-xl border border-violet-200 text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-all bg-white shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* ── Banner Header Banner ── */}
      {cycleDetails && (
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-violet-200/50 relative overflow-hidden">
          {/* Decorative sphere */}
          <div className="absolute -right-16 -top-16 w-48 h-48 rounded-full bg-white/10 blur-xl pointer-events-none" />
          
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="bg-white/20 text-white border border-white/25 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                  Audit Cycle: {cycleDetails.status}
                </span>
              </div>
              <h3 className="text-2xl font-bold font-display tracking-tight">{cycleDetails.name}</h3>
              
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-violet-100">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Scope: {cycleDetails.scope_location || 'All locations'} {cycleDetails.department_name ? `(${cycleDetails.department_name})` : ''}
                </span>
                <span className="hidden sm:inline opacity-50">•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Timeline: {new Date(cycleDetails.start_date).toLocaleDateString()} to {new Date(cycleDetails.end_date).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Auditors Info Section */}
            <div className="bg-white/10 border border-white/20 rounded-xl p-4 md:max-w-xs w-full space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-violet-200 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Assigned Auditors ({auditors.length})
              </h4>
              <div className="space-y-1 max-h-[60px] overflow-y-auto pr-1">
                {auditors.length === 0 ? (
                  <p className="text-[11px] text-violet-200 italic">No assigned auditors</p>
                ) : (
                  auditors.map(a => (
                    <div key={a.id} className="text-[11px] font-medium truncate" title={`${a.name} (${a.email})`}>
                      {a.name} <span className="opacity-75 text-[10px]">({a.email})</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Table: Asset Audit Queue ── */}
      <div className="bg-white border border-violet-100 rounded-2xl overflow-hidden shadow-sm shadow-violet-100">
        <div className="px-5 py-4 border-b border-violet-50 flex items-center justify-between bg-violet-50/10">
          <h3 className="text-xs font-bold text-violet-800 uppercase tracking-widest">Asset Verification Queue</h3>
          {cycleDetails && (
            <span className="text-[11px] text-slate-500">
              Verified: <strong className="text-violet-600">{auditItems.filter(i => i.status === 'Verified').length}</strong> / {auditItems.length}
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-xs text-left">
            <thead>
              <tr className="border-b border-violet-100 bg-violet-50/30">
                <th className="px-5 py-3 text-[9px] font-bold uppercase tracking-widest text-violet-400">Asset Info</th>
                <th className="px-5 py-3 text-[9px] font-bold uppercase tracking-widest text-violet-400">Serial Code</th>
                <th className="px-5 py-3 text-[9px] font-bold uppercase tracking-widest text-violet-400">Expected Location</th>
                <th className="px-5 py-3 text-[9px] font-bold uppercase tracking-widest text-violet-400">Verification Status</th>
                <th className="px-5 py-3 text-[9px] font-bold uppercase tracking-widest text-violet-400">Verified By / Time</th>
                <th className="px-5 py-3 text-[9px] font-bold uppercase tracking-widest text-violet-400">Notes / Flags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-violet-50">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {[...Array(6)].map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-3.5 bg-violet-100 rounded-md w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : auditItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    No items in this audit cycle scope
                  </td>
                </tr>
              ) : (
                auditItems.map(item => (
                  <tr key={item.id} className="hover:bg-violet-50/20 transition-colors">
                    {/* Asset Info */}
                    <td className="px-5 py-4">
                      <p className="font-semibold text-violet-900">{item.asset_name}</p>
                      <span className="font-mono text-[9px] text-violet-600 font-bold bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                        {item.asset_tag || '—'}
                      </span>
                    </td>
                    
                    {/* Serial */}
                    <td className="px-5 py-4 font-mono text-slate-400 text-[10px]">{item.serial_number}</td>
                    
                    {/* Expected Location */}
                    <td className="px-5 py-4 text-slate-500">
                      <span className="flex items-center gap-1">
                        <MapPinIcon className="w-3 h-3 text-violet-400 shrink-0" />
                        {item.expected_location || '—'}
                      </span>
                    </td>

                    {/* Status dropdown / pill */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusPill(item.status)}
                        
                        {/* Only allow editing if cycle is OPEN */}
                        {cycleDetails?.status === 'Open' && (
                          <select
                            disabled={updatingItemId === item.id}
                            value={item.status}
                            onChange={e => handleStatusSelect(item, e.target.value)}
                            className="bg-transparent border-0 hover:bg-violet-50 p-1 rounded cursor-pointer text-[10px] font-semibold text-violet-600 focus:outline-none"
                          >
                            <option value="Pending" disabled>Update…</option>
                            <option value="Verified">Verified</option>
                            <option value="Missing">Missing</option>
                            <option value="Damaged">Damaged</option>
                          </select>
                        )}
                      </div>
                    </td>

                    {/* Verifier details */}
                    <td className="px-5 py-4 text-[11px] text-slate-500">
                      {item.verified_by_name ? (
                        <div>
                          <p className="font-medium text-slate-700">{item.verified_by_name}</p>
                          <p className="text-[9px] text-slate-400 mt-0.5">
                            {new Date(item.verified_at).toLocaleDateString()} {new Date(item.verified_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-300 italic">Not verified</span>
                      )}
                    </td>

                    {/* Notes */}
                    <td className="px-5 py-4 text-[11px] text-slate-500 max-w-[150px] truncate" title={item.notes || ''}>
                      {item.notes || <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Bottom Section: Close Audit Button ── */}
      {cycleDetails && (
        <div className="flex justify-end pt-2">
          {cycleDetails.status === 'Open' ? (
            <button
              onClick={closeAuditCycle}
              disabled={closing}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-violet-200 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {closing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Closing run…
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Close Audit Cycle
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 border border-slate-200 bg-slate-50 px-4 py-2.5 rounded-xl">
              <XCircle className="w-4 h-4 text-slate-400" />
              Audit Cycle has been fully Closed and Locked
            </div>
          )}
        </div>
      )}

      {/* ── Notes / Modal Overlay ── */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(109,40,217,0.10)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-violet-100 animate-[fadeIn_0.25s_ease-out]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-violet-900 uppercase tracking-widest flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                Add Verification Notes
              </h3>
              <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-violet-600"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveNotes} className="space-y-4">
              <p className="text-xs text-slate-500">
                You are marking <strong className="text-slate-700">{editingItem.asset_name}</strong> as <strong className="text-rose-600">{targetStatus}</strong>. Please provide a reason or comment:
              </p>
              
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Describe current state, damage reports, or location discrepancy…"
                required={targetStatus === 'Missing' || targetStatus === 'Damaged'}
                rows={4}
                className="w-full bg-violet-50 border border-violet-200 rounded-xl px-3 py-2 text-xs text-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-400/50"
              />

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-slate-500 border border-violet-200 hover:bg-violet-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-md shadow-violet-200 transition-all active:scale-[0.98]"
                >
                  Confirm State Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline mini icon component to avoid importing MapPin if it is not imported
function MapPinIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}
