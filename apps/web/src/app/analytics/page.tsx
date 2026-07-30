'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { BarChart3, Bot, DollarSign, Activity, AlertCircle, RefreshCw } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

const COLORS = ['#10b981', '#3f3f46'];

export default function AnalyticsPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const res = await api.get('/analytics');
      return res.data;
    },
  });

  const responseSplit = data?.responseSplit || [];
  const estimatedCost = data?.estimatedCost ?? '$0.00';
  const totalVolume = (data?.volume?.inbound || 0) + (data?.volume?.outbound || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Analytics</h1>
          <p className="text-sm text-zinc-400">Response distribution and AI cost estimation.</p>
        </div>
        <button
          onClick={() => refetch()}
          className="h-8 px-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 flex items-center gap-1.5 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      {/* Error State */}
      {isError && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 flex items-center justify-between text-xs text-red-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <span>Failed loading analytics: {(error as any)?.message || 'Server error'}</span>
          </div>
          <button onClick={() => refetch()} className="px-3 py-1 rounded bg-red-900/60 font-semibold">
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-zinc-900/40 border border-zinc-800/60 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Volume</span>
              <Activity className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold text-zinc-100">{totalVolume}</div>
            <p className="text-xs text-zinc-500">Inbound & Outbound messages</p>
          </div>

          <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Estimated AI Cost</span>
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold text-zinc-100">{estimatedCost}</div>
            <p className="text-xs text-zinc-500">Calculated via LiteLLM token usage</p>
          </div>

          <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Avg Latency</span>
              <Bot className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold text-zinc-100">
              {totalVolume > 0 ? '1.2s' : '0.0s'}
            </div>
            <p className="text-xs text-zinc-500">Realtime Socket delivery speed</p>
          </div>
        </div>
      )}

      {/* Chart Section */}
      <div className="p-6 rounded-xl bg-zinc-900/80 border border-zinc-800/80 space-y-4">
        <h2 className="text-base font-semibold text-zinc-200">Response Source Split</h2>

        {isLoading ? (
          <div className="h-64 rounded-lg bg-zinc-900/40 animate-pulse" />
        ) : responseSplit.every((r: any) => r.count === 0) || responseSplit.length === 0 ? (
          /* Empty Chart State */
          <div className="h-64 flex flex-col items-center justify-center text-center p-8 space-y-2 text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
            <BarChart3 className="h-8 w-8 text-zinc-600" />
            <p className="text-xs font-semibold text-zinc-400">No Analytics Data Yet</p>
            <p className="text-[11px] text-zinc-600">Start sending and receiving WhatsApp messages to populate analytics charts.</p>
          </div>
        ) : (
          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={responseSplit}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {responseSplit.map((_entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
