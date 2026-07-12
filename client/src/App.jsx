import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './context/AuthContext.jsx';
import AuthPage from './pages/AuthPage.jsx';
import AssetsPage from './pages/AssetsPage.jsx';
import BookingsPage from './pages/BookingsPage.jsx';
import AuditsPage from './pages/AuditsPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import OrgSetupPage from './pages/OrgSetupPage.jsx';
import AllocationsPage from './pages/AllocationsPage.jsx';
import MaintenancePage from './pages/MaintenancePage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import { 
  Shield, Users, Box, AlertTriangle, ShieldAlert,
  CheckCircle2, Bell, Activity, Cpu, Clock,
  ArrowRightLeft, CalendarDays, LogOut, UserCircle2, Wrench
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
      { id: 1, action: 'ASSET_ALLOCATION',    details: 'MacBook Pro 16" allocated to Aarav Sharma',                 timestamp: '10:14 AM' },
      { id: 2, action: 'MAINTENANCE_LOG',     details: 'Cisco Router service scheduled: Priority High',             timestamp: '09:45 AM' },
      { id: 3, action: 'DEPARTMENT_TRANSFER', details: 'Herman Miller Chair transferred from HR to Mumbai Hub',     timestamp: 'Yesterday' },
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
    { key: 'dashboard',     icon: <Cpu className="w-5 h-5" />,            label: 'Dashboard' },
    { key: 'orgsetup',      icon: <Users className="w-5 h-5" />,          label: 'Organization setup' },
    { key: 'assets',        icon: <Box className="w-5 h-5" />,            label: 'Assets' },
    { key: 'allocations',   icon: <ArrowRightLeft className="w-5 h-5" />,  label: 'Allocation & Transfer' },
    { key: 'bookings',      icon: <CalendarDays className="w-5 h-5" />,    label: 'Resource Booking' },
    { key: 'maintenance',   icon: <Wrench className="w-5 h-5" />,          label: 'Maintenance' },
    { key: 'audits',        icon: <Shield className="w-5 h-5" />,          label: 'Audit' },
    { key: 'reports',       icon: <Activity className="w-5 h-5" />,        label: 'Reports' },
    { key: 'notifications', icon: <Bell className="w-5 h-5" />,            label: 'Notifications' },
  ];

  const visibleNavItems = navItems.filter(item => {
    if (item.key === 'orgsetup') return user?.role === 'Admin';
    return true;
  });

  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ background: '#f5f3ff' }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white border-b border-violet-100 px-6 py-3.5 flex items-center justify-between shadow-sm">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shadow-md shadow-violet-200 bg-white">
            <img src="/logo.png" alt="AssetFlow Logo" className="w-full h-full object-cover" />
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
          {visibleNavItems.map(item => (
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
          {activeTab === 'dashboard' && <DashboardPage onNavigate={setActiveTab} />}

          {/* ── ASSETS ── */}
          {activeTab === 'assets' && <AssetsPage />}

          {/* ── BOOKINGS ── */}
          {activeTab === 'bookings' && <BookingsPage />}

          {/* ── AUDITS ── */}
          {activeTab === 'audits' && <AuditsPage />}

          {/* ── ALLOCATIONS ── */}
          {activeTab === 'allocations' && <AllocationsPage />}

          {/* ── MAINTENANCE ── */}
          {activeTab === 'maintenance' && <MaintenancePage />}

          {/* ── REPORTS ── */}
          {activeTab === 'reports' && <ReportsPage />}

          {/* ── ORG SETUP ── */}
          {activeTab === 'orgsetup' && (
            user?.role === 'Admin' ? (
              <OrgSetupPage />
            ) : (
              <div className="bg-white border border-red-250 rounded-2xl p-12 text-center space-y-3 shadow-xs">
                <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
                <h3 className="text-base font-bold text-red-900 font-display">Access Denied</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  This section is restricted. You must have Administrator privileges to inspect or modify departments, categories, and roles.
                </p>
              </div>
            )
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeTab === 'notifications' && <NotificationsPage />}
        </section>
      </main>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-violet-100 bg-white py-5 text-center text-xs text-slate-400">
        © 2026 AssetFlow Corp · Node + Express + PostgreSQL + Socket.io
      </footer>
    </div>
  );
}
