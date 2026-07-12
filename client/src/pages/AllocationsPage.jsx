import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowRightLeft, AlertTriangle, CheckCircle, RefreshCw, Calendar, FileText, UserPlus, Info, Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AllocationsPage() {
  const { token } = useAuth();

  const [assets, setAssets] = useState([]);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [selectedAssetDetails, setSelectedAssetDetails] = useState(null);
  const [employees, setEmployees] = useState([]);

  // Load state
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [toEmployeeId, setToEmployeeId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [allocEmployeeId, setAllocEmployeeId] = useState('');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [allocationNotes, setAllocationNotes] = useState('');

  // Messages
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch all assets for select dropdown
  const fetchAssets = useCallback(async () => {
    setLoadingAssets(true);
    try {
      const res = await fetch('/api/assets', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load assets.');
      const data = await res.json();
      setAssets(data.assets || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingAssets(false);
    }
  }, [token]);

  // Fetch all employees for dropdown
  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/departments/employees', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load employee list.');
      const data = await res.json();
      setEmployees(data.employees || []);
    } catch (err) {
      console.error('[fetchEmployees]', err.message);
    }
  }, [token]);

  useEffect(() => {
    fetchAssets();
    fetchEmployees();
  }, [fetchAssets, fetchEmployees]);

  // Fetch specific asset details (to retrieve allocation history & holder)
  const fetchAssetDetails = useCallback(async (assetId) => {
    if (!assetId) {
      setSelectedAssetDetails(null);
      return;
    }
    setLoadingDetails(true);
    setError('');
    try {
      const res = await fetch(`/api/assets/${assetId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load asset details.');
      const data = await res.json();
      setSelectedAssetDetails(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingDetails(false);
    }
  }, [token]);

  useEffect(() => {
    fetchAssetDetails(selectedAssetId);
  }, [selectedAssetId, fetchAssetDetails]);

  // Handle direct allocation submit
  const handleAllocate = async (e) => {
    e.preventDefault();
    if (!selectedAssetId || !allocEmployeeId) {
      setError('Please select an asset and a target employee.');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/allocations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          asset_id: Number(selectedAssetId),
          user_id: Number(allocEmployeeId),
          notes: allocationNotes,
          expected_return_date: expectedReturnDate || null
        })
      });

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409 && data.error === 'already_allocated') {
          throw new Error(`Already Allocated to ${data.currentHolder} - direct re-allocation blocked.`);
        }
        throw new Error(data.error || 'Allocation failed.');
      }

      setSuccess('Asset allocated successfully.');
      setAllocEmployeeId('');
      setExpectedReturnDate('');
      setAllocationNotes('');
      // Refresh asset details and list
      fetchAssets();
      fetchAssetDetails(selectedAssetId);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Handle transfer request submit
  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!selectedAssetId || !toEmployeeId || !transferReason) {
      setError('Target employee and reason are required for transfers.');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');

    // Current active holder id
    const activeAlloc = selectedAssetDetails?.allocations?.find(a => a.status === 'active');
    const from_user_id = activeAlloc ? activeAlloc.id : null; // server resolves it if null

    try {
      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          asset_id: Number(selectedAssetId),
          from_user_id,
          to_user_id: Number(toEmployeeId),
          reason: transferReason
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transfer request failed.');

      setSuccess('Transfer request submitted successfully.');
      setToEmployeeId('');
      setTransferReason('');
      // Refresh asset details and list
      fetchAssets();
      fetchAssetDetails(selectedAssetId);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Find the active holder name if allocated
  const activeAllocation = selectedAssetDetails?.allocations?.find(a => a.status === 'active');
  const currentHolderName = activeAllocation ? activeAllocation.user_name : null;

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-violet-900 font-display tracking-tight">Allocations & Transfers</h2>
          <p className="text-xs text-slate-500 mt-0.5">Allocate available assets or initiate custody transfer requests</p>
        </div>
        <button
          onClick={() => {
            fetchAssets();
            if (selectedAssetId) fetchAssetDetails(selectedAssetId);
          }}
          title="Refresh"
          className="self-start sm:self-auto p-2 rounded-xl border border-violet-200 text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-all bg-white shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingAssets || loadingDetails ? 'animate-spin' : ''}`} />
        </button>
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

      {/* ── Asset Selector at Top ── */}
      <div className="bg-white border border-violet-100 rounded-2xl p-5 shadow-sm shadow-violet-100 space-y-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-widest text-violet-500 block">Select Asset</label>
          <select
            value={selectedAssetId}
            onChange={e => setSelectedAssetId(e.target.value)}
            className="w-full bg-violet-50 border border-violet-200 rounded-xl px-4 py-3 text-sm text-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-400/50 shadow-xs"
          >
            <option value="">-- Choose an asset from the ledger --</option>
            {assets.map(a => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.asset_tag} - {a.status})
              </option>
            ))}
          </select>
        </div>

        {/* ── Red Banner when already allocated ── */}
        {selectedAssetDetails && selectedAssetDetails.asset?.status === 'Allocated' && currentHolderName && (
          <div className="flex items-start gap-3 rounded-xl bg-red-50 border border-red-200 p-4 animate-[fadeIn_0.2s_ease-out]">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-red-800 uppercase tracking-wide">Custodian Override Blocked</p>
              <p className="text-xs text-red-700 mt-0.5 font-semibold">
                Already Allocated to {currentHolderName} - direct re-allocation blocked, submit a transfer request below.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Forms Grid ── */}
      {selectedAssetDetails && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Transfer Request Form (Active if Allocated) */}
          {selectedAssetDetails.asset?.status === 'Allocated' ? (
            <div className="bg-white border border-red-150 rounded-2xl p-5 shadow-sm space-y-4 animate-[fadeIn_0.25s_ease-out]">
              <div className="flex items-center gap-2 text-red-800">
                <ArrowRightLeft className="w-5 h-5" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Submit Transfer Request</h3>
              </div>

              <form onSubmit={handleTransfer} className="space-y-4">
                {/* From Employee (Read-only) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Current Custodian (From)</label>
                  <input
                    type="text"
                    value={currentHolderName || ''}
                    disabled
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-500 font-medium cursor-not-allowed"
                  />
                </div>

                {/* To Employee */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Target Custodian (To)</label>
                  <select
                    value={toEmployeeId}
                    onChange={e => setToEmployeeId(e.target.value)}
                    required
                    className="w-full bg-violet-50 border border-violet-200 rounded-xl px-3 py-2.5 text-xs text-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-400/50"
                  >
                    <option value="">Select Target Employee...</option>
                    {employees
                      .filter(emp => !activeAllocation || emp.id !== activeAllocation.user_id) // hide current holder
                      .map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                      ))}
                  </select>
                </div>

                {/* Reason Textarea */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Reason for custody transfer</label>
                  <textarea
                    value={transferReason}
                    onChange={e => setTransferReason(e.target.value)}
                    required
                    placeholder="Provide operational reason for this custody transfer..."
                    rows={3}
                    className="w-full bg-violet-50 border border-violet-200 rounded-xl px-3 py-2 text-xs text-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-400/50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-md shadow-red-200 transition-all active:scale-[0.98]"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Submit Custody Transfer'}
                </button>
              </form>
            </div>
          ) : (
            /* Direct Allocation Form (Active if Available) */
            <div className="bg-white border border-violet-100 rounded-2xl p-5 shadow-sm space-y-4 animate-[fadeIn_0.25s_ease-out]">
              <div className="flex items-center gap-2 text-violet-900">
                <UserPlus className="w-5 h-5 text-violet-600" />
                <h3 className="text-sm font-bold uppercase tracking-wider">Assign Allocation</h3>
              </div>

              <form onSubmit={handleAllocate} className="space-y-4">
                {/* Target Employee */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Target Custodian</label>
                  <select
                    value={allocEmployeeId}
                    onChange={e => setAllocEmployeeId(e.target.value)}
                    required
                    className="w-full bg-violet-50 border border-violet-200 rounded-xl px-3 py-2.5 text-xs text-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-400/50"
                  >
                    <option value="">Select Custodian...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                    ))}
                  </select>
                </div>

                {/* Expected Return Date */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Expected Return Date (Optional)</label>
                  <input
                    type="date"
                    value={expectedReturnDate}
                    onChange={e => setExpectedReturnDate(e.target.value)}
                    className="w-full bg-violet-50 border border-violet-200 rounded-xl px-3 py-2 text-xs text-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-400/50"
                  />
                </div>

                {/* Allocation Notes */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Allocation Notes</label>
                  <textarea
                    value={allocationNotes}
                    onChange={e => setAllocationNotes(e.target.value)}
                    placeholder="Enter details, peripheral assignments, check-out condition..."
                    rows={3}
                    className="w-full bg-violet-50 border border-violet-200 rounded-xl px-3 py-2 text-xs text-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-400/50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-md shadow-violet-200 transition-all active:scale-[0.98]"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirm Custody Assignment'}
                </button>
              </form>
            </div>
          )}

          {/* ── Allocation History List at the Bottom ── */}
          <div className="bg-white border border-violet-100 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-violet-900">
              <FileText className="w-5 h-5 text-violet-600" />
              <h3 className="text-sm font-bold uppercase tracking-wider">Allocation History</h3>
            </div>

            {loadingDetails ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-6 h-6 text-violet-600 animate-spin" />
              </div>
            ) : selectedAssetDetails?.allocations?.length > 0 ? (
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                {selectedAssetDetails.allocations.map((alloc) => (
                  <div key={alloc.id} className="border-l-2 border-violet-200 pl-4 py-1 relative">
                    <div className="absolute w-2 h-2 rounded-full bg-violet-400 -left-[5px] top-2" />
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-violet-950 text-xs">{alloc.user_name}</h4>
                        <p className="text-[10px] text-slate-400">{alloc.user_email}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider
                        ${alloc.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {alloc.status === 'active' ? 'Active' : 'Returned'}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-500 mt-1">
                      <span><strong>Checked Out:</strong> {new Date(alloc.allocated_at).toLocaleDateString()}</span>
                      {alloc.returned_at && (
                        <span><strong>Checked In:</strong> {new Date(alloc.returned_at).toLocaleDateString()}</span>
                      )}
                    </div>
                    {alloc.notes && (
                      <p className="text-[10px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 mt-1.5 italic">
                        Notes: {alloc.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400">
                <Info className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                <p className="text-xs">No custody history for this asset.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {!selectedAssetId && (
        <div className="bg-white border border-violet-100 rounded-2xl p-12 text-center text-slate-400">
          <Info className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-violet-950">No Asset Selected</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1 leading-relaxed">
            Please choose an asset from the dropdown selector above to manage active assignments, initiate transfers, or view history logs.
          </p>
        </div>
      )}
    </div>
  );
}
