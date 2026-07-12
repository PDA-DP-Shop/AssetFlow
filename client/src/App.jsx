import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './context/AuthContext.jsx';
import AuthPage from './pages/AuthPage.jsx';
import { 
  Shield, 
  Layers, 
  Users, 
  Box, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Bell, 
  Search, 
  Activity, 
  Cpu,
  Clock,
  ArrowRightLeft,
  CalendarDays,
  LogOut,
  UserCircle2
} from 'lucide-react';

// Socket connection
const socket = io(window.location.origin, {
  transports: ['websocket', 'polling']
});

export default function App() {
  const { isAuthenticated, user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [assets, setAssets] = useState([]);
  const [logs, setLogs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [dbStatus, setDbStatus] = useState('Checking database...');
  const [isConnected, setIsConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Socket events
    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Socket.io connected:', socket.id);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('notification', (data) => {
      setNotifications(prev => [data, ...prev].slice(0, 10));
      // Automatically add to log
      setLogs(prev => [{
        id: Date.now(),
        action: 'REALTIME_NOTIFICATION',
        details: data.message,
        timestamp: new Date().toLocaleTimeString()
      }, ...prev]);
    });

    socket.on('assetUpdate', (data) => {
      setAssets(prev => prev.map(a => a.id === data.id ? { ...a, ...data } : a));
    });

    // Fetch initial health and tables data from backend API
    fetch('/api/health')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'ok') {
          setDbStatus(`Connected (DB Time: ${new Date(data.db_time).toLocaleTimeString()})`);
        } else {
          setDbStatus('Error connecting to database');
        }
      })
      .catch(err => {
        console.error(err);
        setDbStatus('Local fallback mode (Offline)');
      });

    // Load mock initial data in case the server database is not run yet
    setAssets([
      { id: 1, name: 'MacBook Pro 16"', serial_number: 'SN-77291-A', category: 'Computing', department: 'Engineering', status: 'allocated', cost: '$2,499' },
      { id: 2, name: 'Dell UltraSharp 32" Monitor', serial_number: 'SN-00293-B', category: 'Displays', department: 'Design', status: 'available', cost: '$899' },
      { id: 3, name: 'Cisco Integrated Services Router', serial_number: 'SN-11234-C', category: 'Networking', department: 'IT Operations', status: 'maintenance', cost: '$4,150' },
      { id: 4, name: 'iPad Pro 12.9"', serial_number: 'SN-90082-D', category: 'Mobile Devices', department: 'Sales', status: 'allocated', cost: '$1,099' },
      { id: 5, name: 'Herman Miller Aeron Chair', serial_number: 'SN-55610-E', category: 'Furniture', department: 'Operations', status: 'retired', cost: '$1,200' },
    ]);

    setLogs([
      { id: 1, action: 'ASSET_ALLOCATION', details: 'MacBook Pro 16" allocated to John Doe', timestamp: '10:14 AM' },
      { id: 2, action: 'MAINTENANCE_LOG', details: 'Cisco Router service scheduled: Priority High', timestamp: '09:45 AM' },
      { id: 3, action: 'DEPARTMENT_TRANSFER', details: 'Herman Miller Chair transferred from HR to Operations', timestamp: 'Yesterday' },
      { id: 4, action: 'AUDIT_VERIFIED', details: 'Annual Computing Audit Cycle Completed successfully', timestamp: '2 days ago' },
    ]);

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('notification');
      socket.off('assetUpdate');
    };
  }, []);

  // Gate: show auth page if not logged in
  if (!isAuthenticated) {
    return <AuthPage />;
  }

  const triggerTestNotification = () => {
    // Make request to server to broadcast a socket message
    fetch('/api/test-broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: `System Audit Triggered at ${new Date().toLocaleTimeString()}` })
    }).catch(err => {
      console.warn('API route not ready. Simulating socket alert client-side.');
      socket.emit('testBroadcast', { message: `Simulated: Asset allocation check run at ${new Date().toLocaleTimeString()}` });
    });
  };

  const filteredAssets = assets.filter(asset => 
    asset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.serial_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    asset.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-bg-main text-slate-100 flex flex-col font-sans">
      {/* Top Banner Navigation */}
      <header className="glass-card sticky top-0 z-50 px-6 py-4 flex items-center justify-between border-b border-border-card bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <Layers className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-400 bg-clip-text text-transparent font-display">
              AssetFlow
            </h1>
            <p className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold">Enterprise Operations</p>
          </div>
        </div>

        {/* Live Database Indicators + User Chip */}
        <div className="flex items-center space-x-4 text-xs">
          <div className="hidden md:flex items-center space-x-2">
            <span className="text-slate-400">Database connection:</span>
            <span className="font-semibold text-cyan-400 flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block mr-1"></span>
              {dbStatus}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-slate-400">WebSocket:</span>
            <span className={`font-semibold flex items-center ${isConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
              <span className={`w-2 h-2 rounded-full mr-1.5 ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`}></span>
              {isConnected ? 'Live' : 'Off'}
            </span>
          </div>

          {/* User chip */}
          <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-white/10">
            <div className="flex items-center gap-2 bg-slate-800/60 border border-white/10 rounded-xl px-3 py-1.5">
              <UserCircle2 className="w-4 h-4 text-indigo-400" />
              <span className="text-slate-300 font-medium text-xs">{user?.name || 'User'}</span>
              <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 text-[9px] font-bold uppercase tracking-wider">{user?.role || 'Employee'}</span>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in">
        
        {/* Navigation Sidebar Panel */}
        <aside className="lg:col-span-1 flex flex-col space-y-2">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center space-x-3 ${
              activeTab === 'dashboard' 
                ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 font-medium' 
                : 'text-slate-400 hover:bg-white/[0.02] hover:text-slate-200'
            }`}
          >
            <Cpu className="w-5 h-5" />
            <span>Operational Center</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('assets')} 
            className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center space-x-3 ${
              activeTab === 'assets' 
                ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 font-medium' 
                : 'text-slate-400 hover:bg-white/[0.02] hover:text-slate-200'
            }`}
          >
            <Box className="w-5 h-5" />
            <span>Asset Ledger</span>
          </button>

          <button 
            onClick={() => setActiveTab('audits')} 
            className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center space-x-3 ${
              activeTab === 'audits' 
                ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 font-medium' 
                : 'text-slate-400 hover:bg-white/[0.02] hover:text-slate-200'
            }`}
          >
            <Shield className="w-5 h-5" />
            <span>Compliance Audits</span>
          </button>

          <div className="h-px bg-white/5 my-4" />

          {/* Quick Real-Time Action Panel */}
          <div className="glass-card rounded-2xl p-4 flex flex-col space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              Real-time Bridge
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Dispatch instant actions or simulate automated allocations over standard Socket.io relays.
            </p>
            <button 
              onClick={triggerTestNotification}
              className="w-full bg-linear-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-medium py-2 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 transition-all active:scale-95 cursor-pointer shadow-lg shadow-indigo-500/10"
            >
              <Bell className="w-4 h-4 animate-bounce" />
              <span>Broadcast Test Action</span>
            </button>
          </div>
        </aside>

        {/* Tab Detail View Panels */}
        <section className="lg:col-span-3 space-y-6">
          
          {/* TAB 1: OPERATIONAL CENTER (DASHBOARD) */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Stat Boxes Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="glass-card rounded-2xl p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Total Assets</span>
                    <Box className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="text-2xl font-bold font-display">1,482</div>
                  <span className="text-[10px] text-emerald-400 font-semibold mt-1">+12% this cycle</span>
                </div>

                <div className="glass-card rounded-2xl p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Allocated</span>
                    <Users className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="text-2xl font-bold font-display">1,120</div>
                  <span className="text-[10px] text-slate-400 mt-1">75.5% utilization</span>
                </div>

                <div className="glass-card rounded-2xl p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">In Repair</span>
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="text-2xl font-bold font-display">14</div>
                  <span className="text-[10px] text-amber-400 font-semibold mt-1">2 high priority</span>
                </div>

                <div className="glass-card rounded-2xl p-5 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Audits Checked</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-bold font-display">98.2%</div>
                  <span className="text-[10px] text-emerald-400 font-semibold mt-1">Compliant status</span>
                </div>
              </div>

              {/* Grid with Live Feed + Action Logs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Real-time notification feed */}
                <div className="glass-card rounded-2xl p-6 flex flex-col space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300 flex items-center gap-2">
                      <Bell className="w-4 h-4 text-indigo-400 animate-swing" />
                      Live WebSocket Feed
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      Real-time
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto max-h-[280px] space-y-2 pr-1">
                    {notifications.length === 0 ? (
                      <div className="h-48 flex flex-col items-center justify-center text-slate-500 text-xs text-center border border-dashed border-white/5 rounded-xl">
                        <Clock className="w-6 h-6 mb-2 text-slate-600" />
                        <span>No incoming events. Broadcast an action to test Socket.io server.</span>
                      </div>
                    ) : (
                      notifications.map((n, idx) => (
                        <div key={idx} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl text-xs flex items-start space-x-2 animate-fade-in">
                          <span className="w-2 h-2 mt-1.5 rounded-full bg-cyan-400 inline-block shrink-0"></span>
                          <div>
                            <p className="text-slate-200">{n.message}</p>
                            <span className="text-[9px] text-slate-500 block mt-1">{new Date(n.time || Date.now()).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Audit and activity log */}
                <div className="glass-card rounded-2xl p-6 flex flex-col space-y-4">
                  <h2 className="text-sm font-bold uppercase tracking-widest text-slate-300 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    Latest System Logs
                  </h2>

                  <div className="flex-1 overflow-y-auto max-h-[280px] space-y-3 pr-1">
                    {logs.map((log) => (
                      <div key={log.id} className="text-xs border-l-2 border-indigo-500/30 pl-3 py-0.5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-indigo-400 text-[10px] tracking-wider uppercase">{log.action}</span>
                          <span className="text-[10px] text-slate-500">{log.timestamp}</span>
                        </div>
                        <p className="text-slate-300 text-[11px]">{log.details}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 2: ASSETS LEDGER */}
          {activeTab === 'assets' && (
            <div className="glass-card rounded-2xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-white font-display">Asset Registry</h2>
                  <p className="text-xs text-slate-400">Manage, allocate, and monitor physical and digital computing resources</p>
                </div>
                
                {/* Search Asset Field */}
                <div className="relative max-w-xs w-full">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Search by name, department, serial..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900/60 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder:text-slate-500"
                  />
                </div>
              </div>

              {/* Ledger Table */}
              <div className="overflow-x-auto border border-white/5 rounded-xl">
                <table className="min-w-full divide-y divide-white/5 text-xs text-left">
                  <thead className="bg-white/[0.02] text-slate-400 uppercase tracking-widest text-[9px] font-bold">
                    <tr>
                      <th className="px-6 py-4">Asset Details</th>
                      <th className="px-6 py-4">Serial Code</th>
                      <th className="px-6 py-4">Department / Category</th>
                      <th className="px-6 py-4">Value</th>
                      <th className="px-6 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 bg-slate-950/20">
                    {filteredAssets.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="px-6 py-8 text-center text-slate-500">No assets match your search parameters.</td>
                      </tr>
                    ) : (
                      filteredAssets.map((asset) => (
                        <tr key={asset.id} className="hover:bg-white/[0.01] transition-all">
                          <td className="px-6 py-4 font-semibold text-slate-200">{asset.name}</td>
                          <td className="px-6 py-4 font-mono text-slate-400">{asset.serial_number}</td>
                          <td className="px-6 py-4">
                            <div>{asset.department}</div>
                            <div className="text-[10px] text-slate-500">{asset.category}</div>
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-300">{asset.cost}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider inline-block ${
                              (asset.status || '').toLowerCase() === 'available' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              (asset.status || '').toLowerCase() === 'allocated' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                              (asset.status || '').toLowerCase() === 'reserved' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                              (asset.status || '').toLowerCase() === 'under maintenance' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                              'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}>
                              {asset.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: COMPLIANCE AUDITS */}
          {activeTab === 'audits' && (
            <div className="space-y-6">
              
              {/* Audit Cycles Status Card */}
              <div className="glass-card rounded-2xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-white font-display">Compliance & Audit Center</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Verify internal device allocation records. Keep track of cycle targets, verification timelines, and flag damaged or missing properties immediately.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 my-2">
                  <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl flex items-center space-x-3">
                    <CalendarDays className="w-5 h-5 text-indigo-400" />
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Current Cycle</p>
                      <h4 className="text-sm font-semibold text-slate-200">Q3 Hardware Audit</h4>
                    </div>
                  </div>

                  <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl flex items-center space-x-3">
                    <ArrowRightLeft className="w-5 h-5 text-cyan-400" />
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Pending Verifications</p>
                      <h4 className="text-sm font-semibold text-slate-200">12 Assets</h4>
                    </div>
                  </div>

                  <div className="p-4 bg-white/[0.01] border border-white/5 rounded-xl flex items-center space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Last Audit Date</p>
                      <h4 className="text-sm font-semibold text-slate-200">July 02, 2026</h4>
                    </div>
                  </div>
                </div>
              </div>

              {/* Audit items status table list */}
              <div className="glass-card rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest">Ongoing Verification Queue</h3>
                
                <div className="space-y-2">
                  {[
                    { asset: 'Engineering Server Node 4', cycle: 'Q3 Hardware Audit', auditor: 'Admin (System)', status: 'Pending Verification' },
                    { asset: 'Design Studio iPad 12.9"', cycle: 'Q3 Hardware Audit', auditor: 'Automated Audit', status: 'Self-Verified' },
                    { asset: 'Meeting Room Hub 2', cycle: 'Q3 Hardware Audit', auditor: 'IT Support', status: 'Pending Verification' }
                  ].map((item, idx) => (
                    <div key={idx} className="p-4 bg-white/[0.02] hover:bg-white/[0.03] border border-white/5 rounded-xl flex items-center justify-between text-xs transition-all">
                      <div>
                        <h4 className="font-semibold text-slate-200">{item.asset}</h4>
                        <span className="text-[10px] text-slate-500">{item.cycle} • Auditor: {item.auditor}</span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                        item.status === 'Self-Verified' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </section>
      </main>

      {/* Modern footer */}
      <footer className="mt-auto border-t border-white/5 bg-slate-950/60 py-6 text-center text-xs text-slate-500">
        <p>© 2026 AssetFlow Corp. Autonomous Asset lifecycle management system running on Node + Express + PostgreSQL + Socket.io.</p>
      </footer>
    </div>
  );
}
