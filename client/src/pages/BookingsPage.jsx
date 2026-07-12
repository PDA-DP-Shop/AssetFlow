import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, Clock, User, Plus, X, AlertCircle, CheckCircle2, Loader2, Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function BookingsPage() {
  const { token, user } = useAuth();

  const [resources, setResources] = useState([]);
  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [formStart, setFormStart] = useState('09:00');
  const [formEnd, setFormEnd] = useState('10:00');
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Fetch all resources on mount
  useEffect(() => {
    const fetchResources = async () => {
      try {
        const res = await fetch('/api/resources', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to load resources.');
        const data = await res.json();
        setResources(data.resources || []);
        if (data.resources?.length > 0) {
          setSelectedResourceId(data.resources[0].id.toString());
        }
      } catch (err) {
        setError(err.message);
      }
    };
    fetchResources();
  }, [token]);

  // Fetch bookings for the selected resource and date
  const fetchBookings = useCallback(async () => {
    if (!selectedResourceId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/bookings/${selectedResourceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load bookings.');
      const data = await res.json();
      setBookings(data.schedule || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedResourceId, token]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // ── Time helper math for 9:00 to 13:00 (1:00 PM) ───────────────────────────
  const GRID_START_MIN = 9 * 60;  // 09:00 = 540 mins
  const GRID_END_MIN   = 13 * 60; // 13:00 = 780 mins
  const TOTAL_DURATION = GRID_END_MIN - GRID_START_MIN; // 240 mins

  // Filter bookings that match the selected date and overlap with 9:00 - 13:00
  const filteredBookings = bookings.filter(b => {
    const bStart = new Date(b.start_time);
    const bEnd = new Date(b.end_time);
    
    // Check if dates match (normalized to local date string)
    const localDateStr = bStart.getFullYear() + '-' + 
      String(bStart.getMonth() + 1).padStart(2, '0') + '-' + 
      String(bStart.getDate()).padStart(2, '0');
    
    if (localDateStr !== selectedDate) return false;

    // Check status is Upcoming/Ongoing/Completed
    if (b.status === 'Cancelled') return false;

    // Check if it overlaps with our 9:00 - 13:00 grid window
    const startMins = bStart.getHours() * 60 + bStart.getMinutes();
    const endMins = bEnd.getHours() * 60 + bEnd.getMinutes();
    
    return startMins < GRID_END_MIN && endMins > GRID_START_MIN;
  });

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      // Construct start_time and end_time timestamps using selectedDate and form values
      const startTimeStr = `${selectedDate}T${formStart}:00`;
      const endTimeStr = `${selectedDate}T${formEnd}:00`;
      
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          resource_id: Number(selectedResourceId),
          booked_by: user.id, // Current user id from AuthContext
          start_time: startTimeStr,
          end_time: endTimeStr,
          purpose
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to book slot.');
      }

      setSuccess('Booking reserved successfully!');
      setPurpose('');
      setShowForm(false);
      fetchBookings();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Convert booking to relative layout metrics
  const getBookingLayout = (booking) => {
    const bStart = new Date(booking.start_time);
    const bEnd = new Date(booking.end_time);

    const startMins = bStart.getHours() * 60 + bStart.getMinutes();
    const endMins = bEnd.getHours() * 60 + bEnd.getMinutes();

    // Constrain to grid boundaries for rendering
    const displayStart = Math.max(startMins, GRID_START_MIN);
    const displayEnd = Math.min(endMins, GRID_END_MIN);

    const topPct = ((displayStart - GRID_START_MIN) / TOTAL_DURATION) * 100;
    const heightPct = ((displayEnd - displayStart) / TOTAL_DURATION) * 100;

    return {
      top: `${topPct}%`,
      height: `${heightPct}%`,
      minHeight: '28px' // ensure very short bookings are visible
    };
  };

  const hours = [
    { label: '9:00 AM', time: '09:00' },
    { label: '10:00 AM', time: '10:00' },
    { label: '11:00 AM', time: '11:00' },
    { label: '12:00 PM', time: '12:00' },
    { label: '1:00 PM', time: '13:00' }
  ];

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      {/* ── Header ── */}
      <div>
        <h2 className="text-xl font-bold text-violet-900 font-display tracking-tight">Resource Scheduler</h2>
        <p className="text-xs text-slate-500 mt-0.5">Book meeting spaces, testing rigs, and technical workspaces</p>
      </div>

      {/* ── Top Bar: Dropdown + Date Picker ── */}
      <div className="glass-card rounded-2xl p-5 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          {/* Resource select */}
          <div className="w-full sm:w-64 space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Select Space / Resource</label>
            <select
              value={selectedResourceId}
              onChange={e => setSelectedResourceId(e.target.value)}
              className="w-full bg-violet-50 border border-violet-200 rounded-xl px-3 py-2.5 text-sm text-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-400/50"
            >
              {resources.map(r => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.location})
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker */}
          <div className="w-full sm:w-48 space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="w-full bg-violet-50 border border-violet-200 rounded-xl px-3 py-2 text-sm text-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-400/50"
            />
          </div>
        </div>

        <button
          onClick={() => { setError(''); setSuccess(''); setShowForm(true); }}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-md shadow-violet-200 transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          Book a Slot
        </button>
      </div>

      {/* Banner Messages */}
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

      {/* ── Time-slot Grid (9:00 to 1:00) ── */}
      <div className="glass-card rounded-2xl p-6 relative overflow-hidden bg-white">
        <h3 className="text-sm font-bold text-violet-800 uppercase tracking-widest mb-6 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-violet-500" />
          Schedule Calendar — {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
        </h3>

        <div className="relative flex min-h-[400px] border border-violet-100 rounded-xl bg-violet-50/10">
          {/* Time Labels */}
          <div className="w-20 shrink-0 border-r border-violet-100 flex flex-col justify-between py-2 text-[11px] font-bold text-violet-400 select-none">
            {hours.map(h => (
              <div key={h.label} className="px-3 h-10 flex items-center justify-end">
                {h.label}
              </div>
            ))}
          </div>

          {/* Grid lines & absolute blocks column */}
          <div className="flex-1 relative py-7">
            {/* Grid Line Separators */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="border-b border-violet-100/70 w-full h-0" />
              ))}
            </div>

            {/* Filled Bookings Container */}
            <div className="absolute inset-x-3 top-7 bottom-7">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-xs">
                  <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
                </div>
              ) : filteredBookings.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-xs">
                  <Info className="w-6 h-6 text-violet-300 mb-1" />
                  <span>No bookings scheduled in this slot window</span>
                </div>
              ) : (
                filteredBookings.map(b => {
                  const layout = getBookingLayout(b);
                  return (
                    <div
                      key={b.id}
                      style={layout}
                      className="absolute left-0 right-0 rounded-xl bg-violet-600 text-white px-4 py-2 shadow-md shadow-violet-200/50 flex flex-col justify-center overflow-hidden border border-violet-500/20 group hover:bg-violet-700 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs truncate">{b.purpose || 'Reserved Slot'}</span>
                        <span className="text-[9px] bg-violet-500 text-violet-100 px-1.5 py-0.5 rounded font-mono">
                          {new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(b.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-violet-200">
                        <User className="w-3 h-3 shrink-0" />
                        <span className="truncate">{b.booked_by_name}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Form Modal ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(109,40,217,0.10)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-violet-100 animate-[fadeIn_0.25s_ease-out]">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-violet-100 rounded-xl">
                  <Clock className="w-4 h-4 text-violet-600" />
                </div>
                <h3 className="text-base font-bold text-violet-900 font-display">Book a time slot</h3>
              </div>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-violet-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBooking} className="space-y-4">
              {/* Start Time */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Start Time</label>
                <input
                  type="time"
                  value={formStart}
                  min="09:00"
                  max="13:00"
                  onChange={e => setFormStart(e.target.value)}
                  required
                  className="w-full bg-violet-50 border border-violet-200 rounded-xl px-3 py-2.5 text-sm text-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-400/50"
                />
              </div>

              {/* End Time */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-violet-500">End Time</label>
                <input
                  type="time"
                  value={formEnd}
                  min="09:00"
                  max="13:00"
                  onChange={e => setFormEnd(e.target.value)}
                  required
                  className="w-full bg-violet-50 border border-violet-200 rounded-xl px-3 py-2.5 text-sm text-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-400/50"
                />
              </div>

              {/* Purpose */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-violet-500">Purpose / Meeting Topic</label>
                <input
                  type="text"
                  placeholder="e.g. Design review session"
                  value={purpose}
                  onChange={e => setPurpose(e.target.value)}
                  required
                  className="w-full bg-violet-50 border border-violet-200 rounded-xl px-3 py-2.5 text-sm text-violet-900 focus:outline-none focus:ring-2 focus:ring-violet-400/50 placeholder-slate-400"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-500 border border-violet-200 hover:bg-violet-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-md shadow-violet-200 transition-all active:scale-[0.98]"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Booking…
                    </span>
                  ) : (
                    'Reserve Slot'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
