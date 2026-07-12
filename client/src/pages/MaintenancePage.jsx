import React, { useState, useEffect, useCallback } from 'react';
import {
  Wrench, AlertTriangle, CheckCircle, RefreshCw, Clipboard, User, Loader2, ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const COLUMNS = ['Pending', 'Approved', 'Technician Assigned', 'In Progress', 'Resolved'];

const normalizeStatus = (status) => {
  if (!status) return '';
  return status.toLowerCase().replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
};

const PRIORITY_COLORS = {
  'low':      'bg-slate-100 text-slate-700 border-slate-200',
  'medium':   'bg-amber-50 text-amber-700 border-amber-250',
  'high':     'bg-orange-50 text-orange-700 border-orange-250',
  'critical': 'bg-rose-50 text-rose-700 border-rose-250'
};

export default function MaintenancePage() {
  const { token, user } = useAuth();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isAssetManager = user?.role === 'Admin' || user?.role === 'Manager';

  // Fetch all maintenance requests
  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/maintenance-requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch maintenance requests.');
      const data = await res.json();
      setRequests(data.requests || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Native HTML5 Drag and Drop Handlers
  const handleDragStart = (e, requestId) => {
    if (!isAssetManager) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', requestId.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    if (!isAssetManager) {
      setError('You are not authorized to update maintenance status.');
      return;
    }
    const requestIdStr = e.dataTransfer.getData('text/plain');
    if (!requestIdStr) return;
    const requestId = Number(requestIdStr);

    const request = requests.find(r => r.id === requestId);
    if (!request) return;

    // Avoid redundant status updates
    if (request.status === targetStatus) return;

    setUpdatingId(requestId);
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/maintenance-requests/${requestId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: targetStatus })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update request status.');

      setSuccess(`Updated request #${requestId} status to "${targetStatus}".`);
      await fetchRequests();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col animate-[fadeIn_0.3s_ease-out]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-violet-900 font-display tracking-tight">Maintenance Board</h2>
          <p className="text-xs text-slate-500 mt-0.5">Drag-and-drop maintenance tickets to transition through service phases</p>
        </div>
        <button
          onClick={fetchRequests}
          title="Refresh board"
          className="self-start sm:self-auto p-2 rounded-xl border border-violet-200 text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-all bg-white shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Messages */}
      {!isAssetManager && (
        <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-250 px-4 py-3 text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span><strong>Read-Only Mode:</strong> You must be an Asset Manager or Administrator to move maintenance request cards or update operational statuses.</span>
        </div>
      )}
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

      {/* ── Kanban Grid Board ── */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start flex-1 overflow-x-auto min-h-[500px]">
        {COLUMNS.map(column => {
          const columnRequests = requests.filter(r => normalizeStatus(r.status) === normalizeStatus(column));

          return (
            <div
              key={column}
              onDragOver={e => e.preventDefault()}
              onDrop={e => handleDrop(e, column)}
              className="bg-violet-50/40 border border-violet-100 rounded-2xl p-4 flex flex-col space-y-3 min-h-[450px] transition-all hover:bg-violet-50/60"
            >
              {/* Column Header */}
              <div className="flex justify-between items-center pb-2 border-b border-violet-100">
                <span className="text-xs font-bold text-violet-900 uppercase tracking-wider">{column}</span>
                <span className="bg-violet-100 text-violet-700 font-bold px-2 py-0.5 rounded-full text-[10px]">
                  {columnRequests.length}
                </span>
              </div>

              {/* Column Content */}
              <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
                {loading && requests.length === 0 ? (
                  <div className="flex justify-center py-12">
                    <Loader2 className="w-5 h-5 text-violet-600 animate-spin" />
                  </div>
                ) : columnRequests.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center border-2 border-dashed border-violet-100/60 rounded-xl py-12 text-center text-slate-350 text-[11px] italic">
                    Drop items here
                  </div>
                ) : (
                  columnRequests.map(req => {
                    const isUpdating = updatingId === req.id;
                    const priorityColor = PRIORITY_COLORS[req.priority?.toLowerCase()] || PRIORITY_COLORS['medium'];

                    return (
                      <div
                        key={req.id}
                        draggable={isAssetManager && !isUpdating}
                        onDragStart={e => handleDragStart(e, req.id)}
                        className={`bg-white border border-violet-100 rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-all relative
                          ${isAssetManager ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}
                          ${isUpdating ? 'opacity-50 pointer-events-none' : ''}`}
                      >
                        {/* Upper Details */}
                        <div className="flex justify-between items-start gap-1.5 mb-1.5">
                          <span className="font-mono text-[9px] text-violet-700 font-bold bg-violet-50 border border-violet-100 px-1.5 py-0.2 rounded">
                            {req.asset_tag}
                          </span>
                          <span className={`text-[8px] font-bold uppercase tracking-wider border px-1.5 py-0.2 rounded-full ${priorityColor}`}>
                            {req.priority}
                          </span>
                        </div>

                        {/* Title / Description */}
                        <h4 className="text-xs font-semibold text-slate-700 leading-snug line-clamp-3 mb-2.5">
                          {req.description}
                        </h4>

                        {/* Tech assignment */}
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-400 border-t border-slate-50 pt-2">
                          <User className="w-3.5 h-3.5 text-slate-300" />
                          <span className="truncate">
                            Tech: <strong className="text-slate-600">{req.technician_name || 'Unassigned'}</strong>
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
