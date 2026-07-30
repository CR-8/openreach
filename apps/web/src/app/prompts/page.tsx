'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { Sparkles, Plus, Play, Save, Trash2, Bot, AlertCircle } from 'lucide-react';
import { Badge } from '@openreach/ui';

export default function PromptsPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [temperature, setTemperature] = useState(0.7);

  // Playground Test State
  const [testInput, setTestInput] = useState('');
  const [testOutput, setTestOutput] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  const { data: prompts = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['prompts'],
    queryFn: async () => {
      const res = await api.get('/prompts');
      return res.data;
    },
  });

  useEffect(() => {
    if (prompts.length > 0 && !selectedId) {
      setSelectedId(prompts[0].id);
    }
  }, [prompts, selectedId]);

  const activePrompt = prompts.find((p: any) => p.id === selectedId);

  useEffect(() => {
    if (activePrompt) {
      setName(activePrompt.name);
      setSystemPrompt(activePrompt.systemPrompt);
      setTemperature(activePrompt.temperature);
    }
  }, [activePrompt]);

  const createMutation = useMutation({
    mutationFn: async () => {
      return api.post('/prompts', {
        name: 'New System Prompt',
        systemPrompt: 'You are an AI customer support assistant for WhatsApp.',
        temperature: 0.7,
      });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      setSelectedId(res.data.id);
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedId) return;
      return api.put(`/prompts/${selectedId}`, {
        name,
        systemPrompt,
        temperature: Number(temperature),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
    },
  });

  const testMutation = useMutation({
    mutationFn: async () => {
      setIsTesting(true);
      const res = await api.post('/prompts/test', {
        systemPrompt,
        userMessage: testInput,
        temperature: Number(temperature),
      });
      return res.data;
    },
    onSuccess: (data) => {
      setTestOutput(data.output);
      setIsTesting(false);
    },
    onError: () => {
      setIsTesting(false);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Prompt Studio</h1>
          <p className="text-sm text-zinc-400">Design, version, and test AI system prompts with LiteLLM.</p>
        </div>

        <button
          onClick={() => createMutation.mutate()}
          className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" /> Create Prompt
        </button>
      </div>

      {/* Split View */}
      <div className="h-[calc(100vh-12rem)] flex rounded-xl border border-zinc-800/80 bg-zinc-900/60 overflow-hidden">
        {/* Left List */}
        <div className="w-72 border-r border-zinc-800/80 p-3 bg-zinc-950/40 space-y-2 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-lg bg-zinc-900/60 animate-pulse" />
              ))}
            </div>
          ) : isError ? (
            <div className="p-4 text-center text-xs text-red-400 space-y-2">
              <AlertCircle className="h-5 w-5 mx-auto" />
              <p>Failed loading prompts</p>
              <button onClick={() => refetch()} className="px-2 py-1 bg-zinc-800 text-zinc-200">
                Retry
              </button>
            </div>
          ) : prompts.length === 0 ? (
            <div className="p-6 text-center text-xs text-zinc-500 space-y-2">
              <Sparkles className="h-6 w-6 mx-auto text-zinc-600" />
              <p className="font-semibold text-zinc-400">No Prompts Found</p>
              <p className="text-[11px] text-zinc-600">Click 'Create Prompt' to add a system prompt.</p>
            </div>
          ) : (
            prompts.map((p: any) => {
              const isSelected = p.id === selectedId;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors space-y-1 ${
                    isSelected ? 'bg-zinc-800 border border-emerald-500/40' : 'hover:bg-zinc-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-200">{p.name}</span>
                    <Badge variant="outline">v{p.version}</Badge>
                  </div>
                  <p className="text-[11px] text-zinc-400 line-clamp-1">{p.systemPrompt}</p>
                </div>
              );
            })
          )}
        </div>

        {/* Right Editor & Test Playground */}
        <div className="flex-1 flex flex-col overflow-y-auto p-5 space-y-6">
          {selectedId ? (
            <>
              {/* Top Controls */}
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-transparent text-lg font-bold text-zinc-100 focus:outline-none border-b border-transparent focus:border-emerald-500"
                />

                <button
                  onClick={() => saveMutation.mutate()}
                  className="h-8 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white flex items-center gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" /> Save Changes
                </button>
              </div>

              {/* System Prompt Textarea */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  System Prompt (supports {'{{variable}}'})
                </label>
                <textarea
                  rows={6}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="w-full p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500 font-mono leading-relaxed"
                />
              </div>

              {/* Temperature Slider */}
              <div className="space-y-2 max-w-xs">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Temperature</span>
                  <span className="font-semibold text-emerald-400">{temperature}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              {/* Test Playground */}
              <div className="pt-4 border-t border-zinc-800/80 space-y-4">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider">Test Playground</h3>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type a test user message..."
                    value={testInput}
                    onChange={(e) => setTestInput(e.target.value)}
                    className="flex-1 h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    onClick={() => testMutation.mutate()}
                    disabled={isTesting || !testInput.trim()}
                    className="h-9 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-100 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Play className="h-3.5 w-3.5 text-emerald-400" /> {isTesting ? 'Running...' : 'Run Test'}
                  </button>
                </div>

                {testOutput && (
                  <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 text-xs text-emerald-400 font-mono leading-relaxed">
                    {testOutput}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-2 text-zinc-500">
              <Sparkles className="h-8 w-8 text-zinc-600" />
              <p className="text-xs font-semibold text-zinc-400">No Prompt Selected</p>
              <p className="text-[11px] text-zinc-600">Select an existing prompt or create a new one to edit.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
