'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { QrCode, Key, Wifi, AlertCircle, CheckCircle2, Layers } from 'lucide-react';
import { Badge } from '@openreach/ui';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'ai'>('whatsapp');
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // AI Provider Form
  const [providerName, setProviderName] = useState('OpenAI LiteLLM');
  const [baseUrl, setBaseUrl] = useState('http://localhost:4000/v1');
  const [apiKey, setApiKey] = useState('sk-litellm-master-key');
  const [defaultModel, setDefaultModel] = useState('gpt-4o');

  // Fetch WhatsApp Sessions
  const { data: sessions = [], isLoading: isSessionsLoading, isError: isSessionsError } = useQuery({
    queryKey: ['whatsapp-sessions'],
    queryFn: async () => {
      const res = await api.get('/whatsapp-sessions');
      return res.data;
    },
  });

  // Fetch AI Providers
  const { data: aiProviders = [], isLoading: isAiLoading } = useQuery({
    queryKey: ['ai-providers'],
    queryFn: async () => {
      const res = await api.get('/ai-providers');
      return res.data;
    },
  });

  const connectSessionMutation = useMutation({
    mutationFn: async () => {
      setIsConnecting(true);
      const res = await api.post('/whatsapp-sessions/default-session/connect');
      return res.data;
    },
    onSuccess: (data) => {
      setIsConnecting(false);
      if (data.qrCodeUrl) {
        setQrCodeUrl(data.qrCodeUrl);
      }
      queryClient.invalidateQueries({ queryKey: ['whatsapp-sessions'] });
    },
    onError: () => setIsConnecting(false),
  });

  const saveAiProviderMutation = useMutation({
    mutationFn: async () => {
      return api.post('/ai-providers', {
        name: providerName,
        baseUrl,
        apiKeyEncrypted: apiKey,
        defaultModel,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-providers'] });
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-400">Configure WhatsApp sessions, AI provider keys, and credentials.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-800 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'whatsapp'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Wifi className="h-4 w-4" /> WhatsApp Sessions
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'ai'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Key className="h-4 w-4" /> AI Providers (LiteLLM)
        </button>
      </div>

      {/* Tab 1: WhatsApp Sessions */}
      {activeTab === 'whatsapp' && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-zinc-900/80 border border-zinc-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-zinc-100">Connect WhatsApp Number</h3>
                <p className="text-xs text-zinc-400">
                  Scan the QR code with WhatsApp on your phone to link a session via WPPConnect.
                </p>
              </div>

              <button
                onClick={() => connectSessionMutation.mutate()}
                disabled={isConnecting}
                className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2"
              >
                <QrCode className="h-4 w-4" /> {isConnecting ? 'Starting...' : 'Generate QR Code'}
              </button>
            </div>

            {/* QR Display */}
            {qrCodeUrl && (
              <div className="p-4 rounded-xl bg-white max-w-xs mx-auto text-center space-y-2">
                <img src={qrCodeUrl} alt="WhatsApp QR Code" className="w-full h-auto mx-auto" />
                <p className="text-xs text-zinc-800 font-semibold">Scan with WhatsApp</p>
              </div>
            )}
          </div>

          {/* Connected Sessions List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Configured Sessions</h3>
            {isSessionsLoading ? (
              <div className="h-16 rounded-xl bg-zinc-900/40 animate-pulse" />
            ) : sessions.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-dashed border-zinc-800 space-y-2 text-zinc-500">
                <Wifi className="h-6 w-6 mx-auto text-zinc-600" />
                <p className="text-xs font-semibold text-zinc-400">No WhatsApp Sessions Connected</p>
                <p className="text-[11px] text-zinc-600">Click 'Generate QR Code' above to connect your WhatsApp account.</p>
              </div>
            ) : (
              sessions.map((s: any) => (
                <div key={s.sessionId} className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800/80 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-zinc-200">{s.sessionId}</span>
                    <p className="text-[11px] text-zinc-500">{s.phoneNumber || 'Phone number not verified'}</p>
                  </div>
                  {s.status === 'CONNECTED' ? <Badge variant="success">CONNECTED</Badge> : <Badge variant="destructive">{s.status}</Badge>}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: AI Providers */}
      {activeTab === 'ai' && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl bg-zinc-900/80 border border-zinc-800/80 space-y-4 max-w-xl">
            <h3 className="text-sm font-bold text-zinc-100">Add AI Provider Credentials</h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Provider Name</label>
                <input
                  type="text"
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">LiteLLM Proxy Base URL</label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Default Model</label>
                <input
                  type="text"
                  value={defaultModel}
                  onChange={(e) => setDefaultModel(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200"
                />
              </div>

              <button
                onClick={() => saveAiProviderMutation.mutate()}
                disabled={saveAiProviderMutation.isPending}
                className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold disabled:opacity-50"
              >
                {saveAiProviderMutation.isPending ? 'Saving...' : 'Save AI Credentials'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
