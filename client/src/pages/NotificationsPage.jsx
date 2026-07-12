import React from 'react';
import { Bell, Info, Clock, Activity, AlertTriangle } from 'lucide-react';

export default function NotificationsPage({ notifications = [], logs = [], triggerTestNotification }) {
  return (
    <div className="space-y-6 animate-[fadeIn_0.3s_ease-out]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-violet-900 font-display tracking-tight">Notification Center</h2>
          <p className="text-xs text-slate-500 mt-0.5">Real-time socket alerts and audit logs tracking system transactions</p>
        </div>
        <button
          onClick={triggerTestNotification}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-md shadow-violet-200 transition-all active:scale-[0.98]"
        >
          <Bell className="w-4 h-4" />
          Broadcast Test Event
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Real-time Alerts */}
        <div className="bg-white border border-violet-100 rounded-2xl p-5 shadow-sm shadow-violet-100 space-y-4">
          <h3 className="text-xs font-bold text-violet-900 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-violet-50">
            <Bell className="w-4 h-4 text-violet-600" />
            Live System Alerts ({notifications.length})
          </h3>

          {notifications.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <Info className="w-8 h-8 text-slate-350 mx-auto mb-2" />
              <p className="text-xs italic">No live notifications received yet.</p>
              <p className="text-[10px] text-slate-400 mt-1">Use the broadcast button to test socket relays.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {notifications.map((notif, idx) => (
                <div key={idx} className="flex items-start gap-3 bg-violet-50/50 border border-violet-100 p-3 rounded-xl">
                  <div className="p-1.5 bg-violet-100 text-violet-700 rounded-lg shrink-0">
                    <Bell className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-slate-700 font-medium leading-relaxed">{notif.message}</p>
                    <span className="text-[9px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {notif.time ? new Date(notif.time).toLocaleTimeString() : new Date().toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Transaction History Log */}
        <div className="bg-white border border-violet-100 rounded-2xl p-5 shadow-sm shadow-violet-100 space-y-4">
          <h3 className="text-xs font-bold text-violet-900 uppercase tracking-wider flex items-center gap-1.5 pb-2 border-b border-violet-50">
            <Activity className="w-4 h-4 text-violet-600" />
            Audit ledger updates ({logs.length})
          </h3>

          <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-1">
            {logs.map((log) => (
              <div key={log.id} className="border-l-2 border-violet-200 pl-4 py-1 relative">
                <div className="absolute w-2 h-2 rounded-full bg-violet-400 -left-[5px] top-2" />
                <div className="flex justify-between items-start gap-2">
                  <h4 className="font-bold text-violet-950 text-xs">{log.action}</h4>
                  <span className="text-[9px] text-slate-400">{log.timestamp}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1 italic leading-snug">
                  {log.details}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
