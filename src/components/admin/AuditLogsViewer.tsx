import React, { useState } from 'react';
import { AuditLog } from '../../types';
import { formatDateTime } from '../../lib/utils';
import { ShieldCheck, Search, Filter, Clock, User, AlertCircle, FileText } from 'lucide-react';

interface AuditLogsViewerProps {
  logs: AuditLog[];
}

export const AuditLogsViewer: React.FC<AuditLogsViewerProps> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const filteredLogs = logs.filter((log) => {
    const q = searchTerm.toLowerCase();
    const matchSearch =
      log.action.toLowerCase().includes(q) ||
      log.entity_type.toLowerCase().includes(q) ||
      (log.user_email && log.user_email.toLowerCase().includes(q)) ||
      JSON.stringify(log.details).toLowerCase().includes(q);

    const matchAction = actionFilter === 'all' || log.action.toLowerCase().includes(actionFilter);

    return matchSearch && matchAction;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight font-['Outfit',sans-serif]">
          System Audit Logs
        </h1>
        <p className="text-xs text-zinc-400 mt-0.5">
          Immutable event log of pricing changes, stock adjustments, order updates, and admin activity
        </p>
      </div>

      {/* Filter and Search */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search audit trail by admin, action, or details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 text-zinc-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Events</option>
            <option value="create">Created Events</option>
            <option value="update">Updated / Status Changes</option>
            <option value="adjust">Stock Adjustments</option>
            <option value="delete">Deleted Actions</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="p-3.5 pl-4">Timestamp (Dhaka)</th>
                <th className="p-3.5">Admin Account</th>
                <th className="p-3.5">Action</th>
                <th className="p-3.5">Entity</th>
                <th className="p-3.5 pr-4">Details & Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-8 text-zinc-500">
                    No audit records match the filter.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isStock = log.action.includes('stock');
                  const isDelete = log.action.includes('delete');
                  const isOrder = log.entity_type === 'order';

                  return (
                    <tr key={log.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="p-3.5 pl-4 text-zinc-400 font-mono text-[11px] whitespace-nowrap">
                        {formatDateTime(log.created_at)}
                      </td>

                      <td className="p-3.5">
                        <span className="font-semibold text-zinc-200 block">
                          {log.user_email || 'System'}
                        </span>
                        <span className="text-zinc-400 text-[10px] font-mono">{log.ip_address || '127.0.0.1'}</span>
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                            isDelete
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : isStock
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : isOrder
                              ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td className="p-3.5 uppercase font-mono text-zinc-300 font-medium">
                        {log.entity_type}
                      </td>

                      <td className="p-3.5 pr-4 text-zinc-300 text-xs">
                        <div className="bg-zinc-950 p-2 rounded border border-zinc-800 font-mono text-[11px] max-w-xl truncate">
                          {typeof log.details === 'object'
                            ? JSON.stringify(log.details)
                            : String(log.details)}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
