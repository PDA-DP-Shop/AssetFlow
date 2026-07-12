import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './context/AuthContext.jsx';
import AuthPage from './pages/AuthPage.jsx';
import AssetsPage from './pages/AssetsPage.jsx';
import BookingsPage from './pages/BookingsPage.jsx';
import { 
  Shield, Layers, Users, Box, AlertTriangle,
  CheckCircle2, Bell, Activity, Cpu, Clock,
  ArrowRightLeft, CalendarDays, LogOut, UserCircle2
} from 'lucide-react';

const socket = io(window.location.origin, { transports: ['websocket', 'polling'] });

export default function App() {
  const { isAuthenticated, user, logout } = useAuth();
  const [activeTab, setActiveTab]         = useState('dashboard');
  const [logs, setLogs]                   = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [dbStatus, setDbStatus]           = useState('Checking...');
  const [isConnected, setIsConnected]     = useState(false);

  useEffect(() => {
    socket.on('connect',    () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('notification', (data) => {
      setNotifications(prev => [data, ...prev].slice(0, 10));
      setLogs(prev => [{ id: Date.now(), action: 'REALTIME_NOTIFICATION', details: data.message, timestamp: new Date().toLocaleTimeString() }, ...prev]);
    });

    fetch('/api/health').then(r => r.json())
      .then(d => setDbStatus(d.status === 'ok' ? `Connected (${new Date(d.db_time).toLocaleTimeString()})` : 'Error'))
      .catch(() => setDbStatus('Offline'));

    setLogs([
      { id: 1, action: 'ASSET_ALLOCATION',    details: 'MacBook Pro 16" allocated to John Doe',                    timestamp: '10:14 AM' },
      { id: 2, action: 'MAINTENANCE_LOG',     details: 'Cisco Router service scheduled: Priority High',             timestamp: '09:45 AM' },
      { id: 3, action: 'DEPARTMENT_TRANSFER', details: 'Herman Miller Chair transferred from HR to Operations',     timestamp: 'Yesterday' },
      { id: 4, action: 'AUDIT_VERIFIED',      details: 'Annual Computing Audit Cycle Completed successfully',       timestamp: '2 days ago' },
    ]);

    return () => { socket.off('connect'); socket.off('disconnect'); socket.off('notification'); };
  }, []);

  if (!isAuthenticated) return <AuthPage />;

  const triggerTestNotification = () => {
    fetch('/api/test-broadcast', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `System Audit Triggered at ${new Date().toLocaleTimeString()}` }),
    }).catch(() => socket.emit('testBroadcast', { message: `Simulated: Asset check at ${new Date().toLocaleTimeString()}` }));
  };

  const navItems = [
    { key: 'dashboard', icon: <Cpu className="w-5 h-5" />,    label: 'Operational Center' },
    { key: 'assets',    icon: <Box className="w-5 h-5" />,    label: 'Asset Ledger'        },
    { key: 'bookings',  icon: <CalendarDays className="w-5 h-5" />, label: 'Resource Booking' },
    { key: 'audits',    icon: <Shield className="w-5 h-5" />, label: 'Compliance Audits'   },
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ background: '#f5f3ff' }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white border-b border-violet-100 px-6 py-3.5 flex items-center justify-between shadow-sm">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-md shadow-violet-200">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-violet-900 font-display">AssetFlow</h1>
            <p className="text-[9px] text-violet-400 tracking-widest uppercase font-semibold">Enterprise Operations</p>
          </div>
        </div>

        {/* Status + User */}
        <div className="flex items-center gap-4 text-xs">
          <div className="hidden md:flex items-center gap-1.5 text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping inline-block" />
            <span className="text-violet-600 font-medium">{dbStatus}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-400'}`} />
            <span className={isConnected ? 'text-emerald-600 font-medium' : 'text-rose-500 font-medium'}>
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>

          {/* User chip */}
          <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-violet-100">
            <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-xl px-3 py-1.5">
              <UserCircle2 className="w-4 h-4 text-violet-500" />
              <span className="text-violet-800 font-semibold text-xs">{user?.name || 'User'}</span>
              <span className="px-1.5 py-0.5 rounded-md bg-violet-600 text-white text-[9px] font-bold uppercase tracking-wider">
                {user?.role || 'Employee'}
              </span>
            </div>
            <button onClick={logout} title="Sign out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ──────────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 animate-[fadeIn_0.3s_ease-out]">

        {/* Sidebar */}
        <aside className="lg:col-span-1 flex flex-col gap-1">
          {navItems.map(item => (
            <button key={item.key} onClick={() => setActiveTab(item.key)}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-150 flex items-center gap-3 text-sm font-medium
                ${activeTab === item.key
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-200'
                  : 'text-slate-500 hover:bg-white hover:text-violet-700 hover:shadow-sm'}`}>
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}

          <div className="h-px bg-violet-100 my-3" />

          {/* Real-time bridge card */}
          <div className="glass-card rounded-2xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-violet-700 uppercase tracking-widest flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              Real-time Bridge
            </h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Dispatch socket actions or simulate live allocation events.
            </p>
            <button onClick={triggerTestNotification}
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700
                         text-white font-semibold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-2
                         transition-all active:scale-95 shadow-md shadow-violet-200">
              <Bell className="w-4 h-4" />
              Broadcast Test Action
            </button>
          </div>
        </aside>

        {/* Content */}
        <section className="lg:col-span-3 space-y-6">

          {/* ── DASHBOARD ── */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Stat cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Total Assets',   value: '1,482',  sub: '+12% this cycle',  subColor: 'text-emerald-600', icon: <Box className="w-4 h-4 text-violet-500" /> },
                  { label: 'Allocated',      value: '1,120',  sub: '75.5% utilization', subColor: 'text-slate-400',   icon: <Users className="w-4 h-4 text-indigo-500" /> },
                  { label: 'In Repair',      value: '14',     sub: '2 high priority',  subColor: 'text-amber-600',   icon: <AlertTriangle className="w-4 h-4 text-amber-500" /> },
                  { label: 'Audits Checked', value: '98.2%',  sub: 'Compliant status', subColor: 'text-emerald-600', icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> },
                ].map(card => (
                  <div key={card.label} className="glass-card rounded-2xl p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{card.label}</span>
                      {card.icon}
                    </div>
                    <div className="text-2xl font-bold font-display text-violet-900">{card.value}</div>
                    <span className={`text-[10px] font-semibold mt-1 ${card.subColor}`}>{card.sub}</span>
                  </div>
                ))}
              </div>

              {/* Feed + Logs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Live socket feed */}
                <div className="glass-card rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-violet-800 flex items-center gap-2">
                      <Bell className="w-4 h-4 text-violet-500" />
                      Live WebSocket Feed
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-violet-100 text-violet-600 border border-violet-200">
                      Real-time
                    </span>
                  </div>
                  <div className="overflow-y-auto max-h-[280px] space-y-2 pr-1">
                    {notifications.length === 0 ? (
                      <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs text-center border border-dashed border-violet-200 rounded-xl bg-violet-50/50">
                        <Clock className="w-6 h-6 mb-2 text-violet-300" />
                        <span>No events yet. Click Broadcast to test.</span>
                      </div>
                    ) : notifications.map((n, idx) => (
                      <div key={idx} className="p-3 bg-violet-50 border border-violet-100 rounded-xl text-xs flex items-start gap-2 animate-[fadeIn_0.3s_ease-out]">
                        <span className="w-2 h-2 mt-1.5 rounded-full bg-violet-500 inline-block shrink-0" />
                        <div>
                          <p className="text-violet-900 font-medium">{n.message}</p>
                          <span className="text-[9px] text-slate-400 block mt-0.5">{new Date(n.time || Date.now()).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Activity log */}
                <div className="glass-card rounded-2xl p-6 space-y-4">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-violet-800 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-violet-500" />
                    Latest System Logs
                  </h2>
                  <div className="overflow-y-auto max-h-[280px] space-y-3 pr-1">
                    {logs.map(log => (
                      <div key={log.id} className="text-xs border-l-2 border-violet-300 pl-3 py-0.5 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-violet-600 text-[10px] tracking-wider uppercase">{log.action}</span>
                          <span className="text-[10px] text-slate-400">{log.timestamp}</span>
                        </div>
                        <p className="text-slate-600 text-[11px]">{log.details}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── ASSETS ── */}
          {activeTab === 'assets' && <AssetsPage />}

          {/* ── BOOKINGS ── */}
          {activeTab === 'bookings' && <BookingsPage />}

          {/* ── AUDITS ── */}
          {activeTab === 'audits' && (
            <div className="space-y-6">
              <div className="glass-card rounded-2xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-violet-900 font-display">Compliance & Audit Center</h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Verify internal device allocation records, track cycle targets and flag damaged or missing assets immediately.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { icon: <CalendarDays className="w-5 h-5 text-violet-500" />,  label: 'Current Cycle',        value: 'Q3 Hardware Audit' },
                    { icon: <ArrowRightLeft className="w-5 h-5 text-indigo-500" />, label: 'Pending Verifications', value: '12 Assets' },
                    { icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />, label: 'Last Audit Date',       value: 'July 02, 2026' },
                  ].map(item => (
                    <div key={item.label} className="p-4 bg-violet-50 border border-violet-100 rounded-xl flex items-center gap-3">
                      {item.icon}
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{item.label}</p>
                        <h4 className="text-sm font-semibold text-violet-900">{item.value}</h4>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-card rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-violet-800 uppercase tracking-widest">Ongoing Verification Queue</h3>
                <div className="space-y-2">
                  {[
                    { asset: 'Engineering Server Node 4', cycle: 'Q3 Hardware Audit', auditor: 'Admin (System)', verified: false },
                    { asset: 'Design Studio iPad 12.9"',  cycle: 'Q3 Hardware Audit', auditor: 'Automated Audit', verified: true },
                    { asset: 'Meeting Room Hub 2',         cycle: 'Q3 Hardware Audit', auditor: 'IT Support',      verified: false },
                  ].map((item, idx) => (
                    <div key={idx} className="p-4 bg-violet-50/60 hover:bg-violet-50 border border-violet-100 rounded-xl flex items-center justify-between text-xs transition-all">
                      <div>
                        <h4 className="font-semibold text-violet-900">{item.asset}</h4>
                        <span className="text-[10px] text-slate-400">{item.cycle} · {item.auditor}</span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
                        item.verified
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                          : 'bg-amber-50 text-amber-600 border-amber-200'
                      }`}>
                        {item.verified ? 'Self-Verified' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-violet-100 bg-white py-5 text-center text-xs text-slate-400">
        © 2026 AssetFlow Corp · Node + Express + PostgreSQL + Socket.io
      </footer>
    </div>
  );
}
