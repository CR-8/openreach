'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { GitFork, Plus, Trash2, AlertCircle, Layers } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@openreach/ui';

export default function WorkflowsListPage() {
  const queryClient = useQueryClient();
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const { data: workflows = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const res = await api.get('/workflows');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      return api.post('/workflows', {
        name,
        nodes: [
          { id: '1', type: 'RECEIVE_MESSAGE', position: { x: 250, y: 100 }, data: { label: 'Receive Message' } },
        ],
        edges: [],
        isActive: false,
      });
    },
    onSuccess: () => {
      setNewWorkflowName('');
      setIsCreating(false);
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/workflows/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkflowName.trim()) return;
    createMutation.mutate(newWorkflowName);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Workflows</h1>
          <p className="text-sm text-zinc-400">n8n-style visual WhatsApp automation flows.</p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="h-9 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" /> Create Workflow
        </button>
      </div>

      {/* Error State */}
      {isError && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/60 flex items-center justify-between text-xs text-red-300">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <span>Failed loading workflows: {(error as any)?.message || 'Server error'}</span>
          </div>
          <button onClick={() => refetch()} className="px-3 py-1 rounded bg-red-900/60 font-semibold">
            Retry
          </button>
        </div>
      )}

      {/* New Workflow Modal */}
      {isCreating && (
        <form onSubmit={handleCreate} className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-4 max-w-md">
          <h3 className="text-sm font-bold text-zinc-200">New Workflow Name</h3>
          <input
            type="text"
            placeholder="e.g. Lead Qualification Bot"
            value={newWorkflowName}
            onChange={(e) => setNewWorkflowName(e.target.value)}
            className="w-full h-9 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="h-8 px-3 rounded-lg text-xs text-zinc-400 hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!newWorkflowName.trim() || createMutation.isPending}
              className="h-8 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs text-white font-semibold disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Canvas'}
            </button>
          </div>
        </form>
      )}

      {/* Loading Skeletons */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-36 rounded-xl bg-zinc-900/40 border border-zinc-800/60 animate-pulse" />
          ))}
        </div>
      ) : workflows.length === 0 ? (
        /* Empty State */
        <div className="p-12 text-center rounded-xl bg-zinc-900/40 border border-dashed border-zinc-800 space-y-4">
          <div className="h-12 w-12 mx-auto rounded-full bg-zinc-800/80 text-zinc-400 flex items-center justify-center">
            <Layers className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-zinc-200">No Workflows Created</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Build custom n8n-style visual flows to automate responses, webhooks, and routing.
            </p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
          >
            Create Your First Workflow
          </button>
        </div>
      ) : (
        /* Workflow Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map((w: any) => (
            <div
              key={w.id}
              className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 flex flex-col justify-between space-y-4 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <GitFork className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-200">{w.name}</h3>
                    <p className="text-xs text-zinc-500">Nodes: {Array.isArray(w.nodes) ? w.nodes.length : 0} / 20</p>
                  </div>
                </div>

                {w.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="outline">Inactive</Badge>}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-zinc-800/60">
                <span className="text-[11px] text-zinc-500">
                  Runs: {w._count?.runs || 0}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => deleteMutation.mutate(w.id)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
                    title="Delete Workflow"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <Link
                    href={`/workflows/${w.id}`}
                    className="h-8 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 flex items-center gap-1"
                  >
                    Open Canvas
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
