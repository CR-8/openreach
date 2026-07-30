'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { MessageSquare, Bot, Activity, Wifi, ArrowUpRight, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@openreach/ui';

export default function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const res = await api.get('/dashboard');
      return res.data;
    },
  });

  const stats = data?.stats;
  const recent = data?.recentConversations || [];
  const sessions = data?.sessions || [];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
          <p className="text-sm text-zinc-400">Real-time system metrics and WhatsApp automation status.</p>
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
            <span>Failed to load dashboard metrics: {(error as any)?.message || 'Server error'}</span>
          </div>
          <button
            onClick={() => refetch()}
            className="px-3 py-1 rounded bg-red-900/60 hover:bg-red-800 text-red-200 font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-zinc-900/40 border border-zinc-800/60 animate-pulse" />
          ))}
        </div>
      ) : (
        /* Stat Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Messages Today</span>
              <MessageSquare className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold text-zinc-100">{stats?.messagesToday ?? 0}</div>
            <p className="text-xs text-zinc-500">Live total for today</p>
          </div>

          <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-semibold uppercase tracking-wider">Active Conversations</span>
              <Activity className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold text-zinc-100">{stats?.activeConversations ?? 0}</div>
            <p className="text-xs text-zinc-500">Open conversation threads</p>
          </div>

          <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-semibold uppercase tracking-wider">AI Response Rate</span>
              <Bot className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-extrabold text-zinc-100">{stats?.aiResponseRate ?? 0}%</div>
            <p className="text-xs text-emerald-400/90 font-medium">Automated by LiteLLM</p>
          </div>

          <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-xs font-semibold uppercase tracking-wider">WhatsApp Status</span>
              <Wifi className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-extrabold text-zinc-100">{stats?.connectedSessions ?? 0}</span>
              {(stats?.connectedSessions ?? 0) > 0 ? (
                <Badge variant="success">Online</Badge>
              ) : (
                <Badge variant="destructive">Offline</Badge>
              )}
            </div>
            <p className="text-xs text-zinc-500">WPPConnect sessions</p>
          </div>
        </div>
      )}

      {/* Main Grid: Recent Conversations & WhatsApp Session Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Conversations */}
        <div className="lg:col-span-2 rounded-xl bg-zinc-900/80 border border-zinc-800/80 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-200">Recent Conversations</h2>
            <Link
              href="/conversations"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
            >
              View all <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-lg bg-zinc-900/60 border border-zinc-800/40 animate-pulse" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            /* Empty State */
            <div className="p-10 text-center rounded-lg border border-dashed border-zinc-800 space-y-3">
              <div className="h-10 w-10 mx-auto rounded-full bg-zinc-800/60 text-zinc-400 flex items-center justify-center">
                <Layers className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-zinc-300">No Conversations Yet</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Inbound WhatsApp messages will automatically show up here in real-time.
                </p>
              </div>
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                Connect WhatsApp Session
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60 overflow-hidden rounded-lg border border-zinc-800/60">
              {recent.map((conv: any) => (
                <div key={conv.id} className="p-4 flex items-center justify-between hover:bg-zinc-800/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-emerald-400">
                      {conv.contact?.name?.charAt(0) || 'C'}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-zinc-200">{conv.contact?.name || conv.contact?.phone}</span>
                        {conv.aiEnabled && <Badge variant="secondary">AI</Badge>}
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-1">
                        {conv.messages?.[0]?.content || 'Conversation initialized'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-zinc-500">
                    {new Date(conv.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* WhatsApp Session Status Widget */}
        <div className="rounded-xl bg-zinc-900/80 border border-zinc-800/80 p-5 space-y-4">
          <h2 className="text-base font-semibold text-zinc-200">WhatsApp Sessions</h2>
          {sessions.length === 0 ? (
            <div className="p-6 text-center rounded-lg border border-dashed border-zinc-800 space-y-3">
              <Wifi className="h-6 w-6 mx-auto text-zinc-500" />
              <p className="text-xs text-zinc-400">No sessions configured.</p>
              <Link
                href="/settings"
                className="inline-block px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold"
              >
                Connect Number
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((s: any) => (
                <div key={s.sessionId} className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-200">{s.sessionId}</span>
                    <span className={`h-2 w-2 rounded-full ${s.status === 'CONNECTED' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  </div>
                  <p className="text-xs text-zinc-500">{s.phoneNumber || 'Phone not linked'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
