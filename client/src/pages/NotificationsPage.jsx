import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell, Info, Clock, AlertTriangle, ArrowRightLeft, Calendar, ShieldCheck, Loader2, CheckCircle2, Inbox
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'alert', label: 'Alerts' },
  { key: 'assignment', label: 'Approvals' },
  { key: 'booking', label: 'Bookings' }
];

function formatRelativeTime(dateString) {
  if (!dateString) return 'just now';
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  if (diffMs < 0) return 'just now';

  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function NotificationsPage() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch initial notifications
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load notifications.');
      const data = await res.json();
      setNotifications(data.notifications || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications();

    // Listen to real-time updates via Socket.io
    const socket = io();
    
    // Listen to both notification and notification:new
    const handleNewNotif = (notif) => {
      console.log('[NotificationsPage] Live Socket event received:', notif);
      setNotifications(prev => {
        // Avoid inserting duplicate notifications if they happen to match messages
        const exists = prev.some(item => item.message === notif.message && Math.abs(new Date(item.created_at || item.time) - new Date()) < 2000);
        if (exists) return prev;
        
        return [
          {
            id: notif.id || Date.now(),
            message: notif.message,
            type: notif.type || 'general',
            created_at: notif.time || new Date().toISOString(),
            is_read: false
          },
          ...prev
        ];
      });
    };

    socket.on('notification', handleNewNotif);
    socket.on('notification:new', handleNewNotif);

    return () => {
      socket.off('notification', handleNewNotif);
      socket.off('notification:new', handleNewNotif);
      socket.disconnect();
    };
  }, [fetchNotifications]);

  // Bulk mark all read
  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err.message);
    }
  };

  // Filter notifications list
  const filteredNotifications = notifications.filter(notif => {
    if (activeFilter === 'all') return true;
    return notif.type === activeFilter;
  });

  // Helper to render type-specific icons
  const getIcon = (type) => {
    switch (type) {
      case 'alert':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'assignment':
        return <ArrowRightLeft className="w-4 h-4 text-indigo-600" />;
      case 'booking':
        return <Calendar className="w-4 h-4 text-violet-600" />;
      case 'audit':
        return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  // Helper to get type color wrappers
  const getIconClass = (type) => {
    switch (type) {
      case 'alert':
        return 'bg-amber-50 border border-amber-200';
      case 'assignment':
        return 'bg-indigo-50 border border-indigo-200';
      case 'booking':
        return 'bg-violet-50 border border-violet-200';
      case 'audit':
        return 'bg-emerald-50 border border-emerald-250';
      default:
        return 'bg-slate-50 border border-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-violet-900 font-display tracking-tight">Notification Center</h2>
          <p className="text-xs text-slate-500 mt-0.5">Real-time socket system reminders, approvals, and alert records</p>
        </div>
        {notifications.some(n => !n.is_read) && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 self-start sm:self-auto px-4 py-2 bg-white border border-violet-200 hover:border-violet-300 rounded-xl text-xs font-semibold text-violet-700 hover:bg-violet-50/50 transition-all active:scale-[0.98] shadow-2xs"
          >
            <CheckCircle2 className="w-4 h-4" />
            Mark all read
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs Filter Bar */}
      <div className="bg-white border border-violet-100 p-1.5 rounded-2xl flex gap-1.5 shadow-2xs">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all
              ${activeFilter === tab.key
                ? 'bg-violet-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-violet-700 hover:bg-violet-50/50'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="bg-white border border-violet-100 rounded-2xl p-5 shadow-xs">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-7 h-7 text-violet-600 animate-spin" />
            <p className="text-xs text-slate-400">Syncing live alerts...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-24 text-center space-y-2">
            <Inbox className="w-10 h-10 text-slate-350 mx-auto" />
            <p className="text-xs text-slate-400 italic">No notifications found under "{FILTER_TABS.find(f => f.key === activeFilter)?.label}" filter.</p>
          </div>
        ) : (
          <div className="divide-y divide-violet-50/60">
            {filteredNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`py-4 flex gap-4 first:pt-0 last:pb-0 transition-colors
                  ${!notif.is_read ? 'bg-violet-50/20 px-3 -mx-3 rounded-xl' : ''}`}
              >
                {/* Icon wrapper */}
                <div className={`p-2 rounded-xl shrink-0 h-9 w-9 flex items-center justify-center ${getIconClass(notif.type)}`}>
                  {getIcon(notif.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-xs text-slate-700 font-medium leading-relaxed break-words">
                    {notif.message}
                  </p>
                  <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatRelativeTime(notif.created_at)}
                    </span>
                    {!notif.is_read && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-violet-600" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
