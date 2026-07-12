import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Users, Calendar, ArrowLeftRight, Clock, AlertTriangle, AlertCircle, PlusCircle, CalendarPlus, FileText, Activity, RefreshCw
} from 'lucide-react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

// Connect to socket for live activity stream
const socketUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000'
  : window.location.origin;

const socket = io(socketUrl, { transports: ['websocket', 'polling'] });

export default function DashboardPage({ onNavigate }) {
  const { token } = useAuth();
  
  const [summary, setSummary] = useState({
    available: 0,
    allocated: 0,
    active_bookings: 0,
    pending_transfers: 0,
    upcoming_returns: 0,
    under_maintenance: 0,
    overdue: 0
  });
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch summary data from backend
  const fetchSummary = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/dashboard/summary', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load dashboard summary.');
      const data = await res.json();
      setSummary(data.summary || {});
      setActivities(data.activities || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  // Wire recent activity list to Socket.io events for real-time live prepending
  useEffect(() => {
    socket.on('activity', (newActivity) => {
      setActivities(prev => [
        {
          id: Date.now(),
          action: newActivity.action,
          details: newActivity.details,
          timestamp: new Date().toLocaleTimeString(),
          user_name: newActivity.user_name || 'System'
        },
        ...prev
      ].slice(0, 15)); // keep top 15

      // Also increment/decrement KPI states dynamically based on the action
      if (newActivity.action === 'ASSET_REGISTER') {
        setSummary(prev => ({ ...prev, available: prev.available + 1 }));
      } else if (newActivity.action === 'BOOKING_CREATE') {
        setSummary(prev => ({ ...prev, active_bookings: prev.active_bookings + 1 }));
      }
    });

    return () => {
      socket.off('activity');
    };
  }, []);

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      {/* ── Overdue Returns Red Banner ── */}
      {summary.overdue > 0 && (
        <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-2xl px-5 py-4 text-sm text-red-700 shadow-sm animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-xl">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <span className="font-bold">{summary.overdue} assets are overdue for return</span> — flagged for immediate department follow-up and compliance audit.
            </div>
          </div>
          <button 
            onClick={() => onNavigate('assets')}
            className="text-xs font-bold underline hover:text-red-900 transition-colors"
          >
            Review Ledger
          </button>
        </div>
      )}

      {/* ── Today's Overview Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-violet-900 font-display tracking-tight">Today's Overview</h2>
          <p className="text-xs text-slate-500 mt-0.5">Real-time status metrics and quick operations control panel</p>
        </div>
        <button
          onClick={fetchSummary}
          className="p-2 rounded-xl border border-violet-200 text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-all bg-white shadow-xs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Available',         value: summary.available,         sub: 'Ready for use',        icon: <Box className="w-4 h-4 text-emerald-500" />,      bg: 'bg-white border-violet-100', nav: 'assets' },
          { label: 'Allocated',          value: summary.allocated,         sub: 'Currently assigned',    icon: <Users className="w-4 h-4 text-violet-500" />,     bg: 'bg-white border-violet-100', nav: 'allocations' },
          { label: 'Active Bookings',    value: summary.active_bookings,   sub: 'Resource slots',        icon: <Calendar className="w-4 h-4 text-indigo-500" />,  bg: 'bg-white border-violet-100', nav: 'bookings' },
          { label: 'Pending Transfers',  value: summary.pending_transfers, sub: 'Awaiting approval',     icon: <ArrowLeftRight className="w-4 h-4 text-blue-500" />, bg: 'bg-white border-violet-100', nav: 'allocations' },
          { label: 'Upcoming Returns',   value: summary.upcoming_returns,  sub: 'Due next 7 days',       icon: <Clock className="w-4 h-4 text-amber-500" />,      bg: 'bg-white border-violet-100', nav: 'assets' },
          { label: 'In Repair',          value: summary.under_maintenance, sub: 'Under maintenance',     icon: <AlertTriangle className="w-4 h-4 text-rose-500" />, bg: 'bg-white border-violet-100', nav: 'maintenance' }
        ].map(card => (
          <button
            key={card.label}
            onClick={() => onNavigate(card.nav)}
            className={`glass-card rounded-2xl p-4 flex flex-col justify-between min-h-[110px] text-left transition-all hover:shadow-md hover:scale-[1.02] active:scale-[0.99] ${card.bg}`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 truncate">{card.label}</span>
              {card.icon}
            </div>
            <div>
              <div className="text-2xl font-bold font-display text-violet-900">{card.value}</div>
              <p className="text-[10px] text-slate-400 mt-0.5 truncate">{card.sub}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ── Quick Action Panel ── */}
      <div className="glass-card rounded-2xl p-5 bg-white space-y-4">
        <h3 className="text-xs font-bold text-violet-800 uppercase tracking-widest">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Action 1 — Register Asset */}
          <button
            onClick={() => onNavigate('assets')}
            className="flex items-center gap-3 p-4 border border-violet-100 rounded-xl hover:bg-violet-50/50 hover:border-violet-300 hover:shadow-sm transition-all text-left group"
          >
            <div className="p-2 bg-violet-100 text-violet-700 rounded-xl group-hover:bg-violet-200 transition-colors">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-violet-900">Register Asset</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Add computing/hardware devices</p>
            </div>
          </button>

          {/* Action 2 — Book Resource */}
          <button
            onClick={() => onNavigate('bookings')}
            className="flex items-center gap-3 p-4 border border-violet-100 rounded-xl hover:bg-indigo-50/50 hover:border-indigo-300 hover:shadow-sm transition-all text-left group"
          >
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl group-hover:bg-indigo-200 transition-colors">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-violet-900">Book Resource</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Schedule rooms & spaces</p>
            </div>
          </button>

          {/* Action 3 — Raise Transfer */}
          <button
            onClick={() => onNavigate('allocations')}
            className="flex items-center gap-3 p-4 border border-violet-100 rounded-xl hover:bg-blue-50/50 hover:border-blue-300 hover:shadow-sm transition-all text-left group"
          >
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl group-hover:bg-blue-200 transition-colors">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-violet-900">Raise Requests</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Asset transfers & custody</p>
            </div>
          </button>

          {/* Action 4 — View Reports */}
          <button
            onClick={() => onNavigate('reports')}
            className="flex items-center gap-3 p-4 border border-violet-100 rounded-xl hover:bg-emerald-50/50 hover:border-emerald-300 hover:shadow-sm transition-all text-left group"
          >
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl group-hover:bg-emerald-200 transition-colors">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-violet-900">View Reports</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Analytics & export data</p>
            </div>
          </button>
        </div>
      </div>

      {/* ── Recent Activity Feed ── */}
      <div className="glass-card rounded-2xl p-6 bg-white space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-violet-800 uppercase tracking-widest flex items-center gap-2">
            <Activity className="w-4 h-4 text-violet-500" />
            Recent Activity Log
          </h3>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-violet-100 text-violet-600 border border-violet-200 animate-pulse">
            Live Stream Connected
          </span>
        </div>

        <div className="divide-y divide-violet-50 max-h-[350px] overflow-y-auto pr-1">
          {loading ? (
            [...Array(3)].map((_, i) => (
              <div key={i} className="py-3 flex items-center justify-between animate-pulse">
                <div className="space-y-1">
                  <div className="h-3 bg-violet-100 rounded-md w-48" />
                  <div className="h-2 bg-violet-50 rounded-md w-32" />
                </div>
                <div className="h-3 bg-violet-50 rounded-md w-16" />
              </div>
            ))
          ) : activities.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400 italic">No recent logged actions</p>
          ) : (
            activities.map(log => (
              <div key={log.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                <div className="space-y-1">
                  <p className="font-semibold text-violet-900">{log.details}</p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span className="font-semibold text-violet-600 uppercase tracking-wider text-[8px] bg-violet-50 px-1 py-0.5 rounded border border-violet-100">
                      {log.action}
                    </span>
                    <span>•</span>
                    <span>By: {log.user_name || 'System'}</span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 whitespace-nowrap">
                  {log.timestamp ? (
                    // Check if it's already a time string or a ISO string
                    log.timestamp.includes(':') && !log.timestamp.includes('-')
                      ? log.timestamp
                      : new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  ) : 'Just now'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
