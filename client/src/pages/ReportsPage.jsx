import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, Wrench, Box, Trash2, Calendar, Download, RefreshCw, AlertTriangle, Info, Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ReportsPage() {
  const { token } = useAuth();

  const [utilization, setUtilization] = useState([]);
  const [maintenanceFreq, setMaintenanceFreq] = useState([]);
  const [mostUsedResources, setMostUsedResources] = useState([]);
  const [idleAssets, setIdleAssets] = useState([]);
  const [dueMaintenance, setDueMaintenance] = useState([]);
  const [dueRetirement, setDueRetirement] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch all report segments
  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Department Utilization
      const utilRes = await fetch('/api/reports/utilization', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const utilData = await utilRes.json();
      setUtilization(utilData.utilization || []);

      // 2. Maintenance Frequency
      const maintRes = await fetch('/api/reports/maintenance-frequency', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const maintData = await maintRes.json();
      setMaintenanceFreq(maintData.frequency_by_category || []);

      // 3. Most Used & Idle Assets
      const usageRes = await fetch('/api/reports/most-used-idle', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const usageData = await usageRes.json();
      setMostUsedResources(usageData.most_used_resources || []);
      setIdleAssets(usageData.idle_assets || []);

      // 4. Maintenance / Retirement Alerts
      const alertRes = await fetch('/api/reports/due-for-maintenance-or-retirement', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const alertData = await alertRes.json();
      setDueMaintenance(alertData.due_for_maintenance || []);
      setDueRetirement(alertData.due_for_retirement || []);

    } catch (err) {
      setError(err.message || 'Failed to load report analytics.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Export current view as CSV
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';

    // 1. Utilization
    csvContent += '1. Utilization by Department\r\n';
    csvContent += 'Department,Total Historical Allocations,Active Allocations\r\n';
    utilization.forEach(item => {
      csvContent += `"${item.department_name}",${item.total_allocations},${item.active_allocations}\r\n`;
    });
    csvContent += '\r\n';

    // 2. Maintenance Frequency
    csvContent += '2. Maintenance Frequency by Category\r\n';
    csvContent += 'Category Name,Request Count,Total Maintenance Cost\r\n';
    maintenanceFreq.forEach(item => {
      csvContent += `"${item.category_name}",${item.request_count},${item.total_cost}\r\n`;
    });
    csvContent += '\r\n';

    // 3. Most Used Resources
    csvContent += '3. Most Used Bookable Resources\r\n';
    csvContent += 'Resource Name,Location,Total Booking Slots\r\n';
    mostUsedResources.forEach(item => {
      csvContent += `"${item.resource_name}","${item.location || 'N/A'}",${item.booking_count}\r\n`;
    });
    csvContent += '\r\n';

    // 4. Idle Assets
    csvContent += '4. Idle Assets (Unused 30+ Days)\r\n';
    csvContent += 'Asset Name,Asset Tag,Expected Location,Current Status\r\n';
    idleAssets.forEach(item => {
      csvContent += `"${item.asset_name}","${item.asset_tag}","${item.location || 'N/A'}","${item.status}"\r\n`;
    });
    csvContent += '\r\n';

    // 5. Retirement alerts
    csvContent += '5. Assets Nearing Retirement\r\n';
    csvContent += 'Asset Name,Asset Tag,Acquisition Date,Current Condition\r\n';
    dueRetirement.forEach(item => {
      csvContent += `"${item.asset_name}","${item.asset_tag}","${new Date(item.acquisition_date).toLocaleDateString()}","${item.condition}"\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'AssetFlow_Operational_Analytics.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-violet-900 font-display tracking-tight">Reports & Analytics</h2>
          <p className="text-xs text-slate-500 mt-0.5">Aggregate performance graphs, idle trackers, and compliance schedules</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-md shadow-violet-200 transition-all active:scale-[0.98]"
          >
            <Download className="w-4 h-4" />
            Export Report (CSV)
          </button>
          <button
            onClick={fetchReports}
            title="Refresh reports"
            className="p-2 rounded-xl border border-violet-200 text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition-all bg-white shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Graph Cards: Side by Side ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Utilization by Department */}
        <div className="bg-white border border-violet-100 rounded-2xl p-5 shadow-sm shadow-violet-100 flex flex-col h-[350px]">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-violet-600" />
            <h3 className="text-xs font-bold text-violet-900 uppercase tracking-wider">Utilization by Department</h3>
          </div>
          <div className="flex-1 min-h-0">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-violet-600 animate-spin" />
              </div>
            ) : utilization.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No utilization metrics available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={utilization} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f3ff" />
                  <XAxis dataKey="department_name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval={0} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12, borderColor: '#e9d5ff' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="total_allocations" name="Total Allocations" fill="#6d28d9" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="active_allocations" name="Active" fill="#818cf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Maintenance Frequency by Category */}
        <div className="bg-white border border-violet-100 rounded-2xl p-5 shadow-sm shadow-violet-100 flex flex-col h-[350px]">
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="w-4 h-4 text-violet-600" />
            <h3 className="text-xs font-bold text-violet-900 uppercase tracking-wider">Maintenance Frequency</h3>
          </div>
          <div className="flex-1 min-h-0">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-violet-600 animate-spin" />
              </div>
            ) : maintenanceFreq.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No maintenance history records found.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={maintenanceFreq} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f3ff" />
                  <XAxis dataKey="category_name" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} interval={0} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12, borderColor: '#e9d5ff' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="request_count" name="Tickets count" stroke="#4f46e5" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ── Three Detail Lists ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Most Used Assets */}
        <div className="bg-white border border-violet-100 rounded-2xl p-5 shadow-sm shadow-violet-100 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-violet-50">
            <TrendingUp className="w-4 h-4 text-violet-600" />
            <h3 className="text-xs font-bold text-violet-950 uppercase tracking-wider">Most Used Resources</h3>
          </div>
          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-violet-600" /></div>
          ) : mostUsedResources.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-6 text-center">No resource bookings recorded.</p>
          ) : (
            <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
              {mostUsedResources.map((item, idx) => (
                <div key={item.id || idx} className="flex justify-between items-center gap-2">
                  <div>
                    <h4 className="font-semibold text-violet-900 text-xs">{item.resource_name}</h4>
                    <p className="text-[10px] text-slate-400">{item.location || 'Central Location'}</p>
                  </div>
                  <span className="bg-violet-50 text-violet-700 font-bold px-2 py-0.5 rounded-lg text-[10px] border border-violet-100">
                    {item.booking_count} bookings
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Idle Assets (Unused 30+ Days) */}
        <div className="bg-white border border-violet-100 rounded-2xl p-5 shadow-sm shadow-violet-100 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-violet-50">
            <Box className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-bold text-violet-950 uppercase tracking-wider">Idle Assets (30+ Days)</h3>
          </div>
          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-violet-600" /></div>
          ) : idleAssets.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-6 text-center">All assets active or checked out recently.</p>
          ) : (
            <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
              {idleAssets.map((item) => (
                <div key={item.id} className="flex justify-between items-center gap-2">
                  <div>
                    <h4 className="font-semibold text-violet-900 text-xs">{item.asset_name}</h4>
                    <span className="font-mono text-[9px] text-violet-500 font-bold bg-violet-50 border border-violet-100 px-1 py-0.2 rounded mt-0.5 inline-block">
                      {item.asset_tag}
                    </span>
                  </div>
                  <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-lg text-[9px] font-semibold uppercase">
                    Unused
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assets Due for Maintenance / Retirement */}
        <div className="bg-white border border-violet-100 rounded-2xl p-5 shadow-sm shadow-violet-100 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-violet-50">
            <Calendar className="w-4 h-4 text-rose-500" />
            <h3 className="text-xs font-bold text-violet-950 uppercase tracking-wider">Alerts & Life Cycle</h3>
          </div>
          {loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-violet-600" /></div>
          ) : dueMaintenance.length === 0 && dueRetirement.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-6 text-center">No alerts. All compliance checks up-to-date.</p>
          ) : (
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
              {/* Due for Maintenance list */}
              {dueMaintenance.map((m) => (
                <div key={`m-${m.request_id}`} className="border-l-2 border-amber-300 pl-3.5 relative">
                  <div className="absolute w-2 h-2 rounded-full bg-amber-400 -left-[5px] top-1" />
                  <h4 className="font-semibold text-violet-900 text-xs flex justify-between items-center">
                    {m.asset_name}
                    <span className="text-[8px] bg-amber-50 text-amber-700 font-bold border border-amber-200 rounded px-1 uppercase tracking-tight ml-2">
                      Maint
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1 italic">Sched: {new Date(m.scheduled_date).toLocaleDateString()}</p>
                </div>
              ))}

              {/* Due for Retirement list */}
              {dueRetirement.map((r) => (
                <div key={`r-${r.id}`} className="border-l-2 border-rose-300 pl-3.5 relative">
                  <div className="absolute w-2 h-2 rounded-full bg-rose-400 -left-[5px] top-1" />
                  <h4 className="font-semibold text-violet-900 text-xs flex justify-between items-center">
                    {r.asset_name}
                    <span className="text-[8px] bg-rose-50 text-rose-700 font-bold border border-rose-200 rounded px-1 uppercase tracking-tight ml-2">
                      Retire
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1 italic">Age check: purchased {new Date(r.acquisition_date).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
