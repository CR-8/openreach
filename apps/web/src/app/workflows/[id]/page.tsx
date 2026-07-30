'use client';

import React, { useState, useEffect, useCallback, use } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../lib/api';
import { getSocket } from '../../../lib/socket';
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Node,
  Edge,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Save, Play, ArrowLeft, Plus, Layers, Settings2, History, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@openreach/ui';

const NODE_PALETTE = [
  { type: 'RECEIVE_MESSAGE', label: 'Receive Message', category: 'trigger' },
  { type: 'CONDITION', label: 'Condition', category: 'logic' },
  { type: 'SWITCH', label: 'Switch', category: 'logic' },
  { type: 'AI_RESPONSE', label: 'AI Response', category: 'ai' },
  { type: 'KNOWLEDGE_SEARCH', label: 'Knowledge Search', category: 'ai' },
  { type: 'SEND_MESSAGE', label: 'Send Message', category: 'action' },
  { type: 'DELAY', label: 'Delay', category: 'action' },
  { type: 'HTTP_REQUEST', label: 'HTTP Request', category: 'action' },
  { type: 'WEBHOOK', label: 'Webhook', category: 'action' },
  { type: 'DATABASE_QUERY', label: 'Database Query', category: 'action' },
  { type: 'ASSIGN_TICKET', label: 'Assign Ticket', category: 'action' },
  { type: 'HUMAN_TAKEOVER', label: 'Human Takeover', category: 'action' },
  { type: 'END', label: 'End', category: 'flow' },
];

function CustomNodeComponent({ data, selected }: any) {
  const category = data.category || 'action';
  let borderStyle = 'border-l-green-500';
  if (category === 'trigger') borderStyle = 'border-l-blue-500';
  if (category === 'logic') borderStyle = 'border-l-amber-500';
  if (category === 'ai') borderStyle = 'border-l-violet-500';

  return (
    <div
      className={`px-4 py-3 rounded-xl bg-zinc-900 border-2 ${
        selected ? 'border-emerald-500' : 'border-zinc-800'
      } border-l-4 ${borderStyle} text-zinc-100 shadow-xl min-w-[180px] space-y-1`}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-zinc-600 border-2 border-zinc-900" />
      <div className="text-xs font-bold truncate">{data.label || 'Node'}</div>
      <div className="text-[10px] text-zinc-400 uppercase tracking-wider">{data.type}</div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-emerald-500 border-2 border-zinc-900" />
    </div>
  );
}

const nodeTypes = {
  custom: CustomNodeComponent,
};

export default function WorkflowCanvasPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const workflowId = resolvedParams.id;
  const queryClient = useQueryClient();

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [activeNode, setActiveNode] = useState<Node | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [workflowName, setWorkflowName] = useState('');
  const [runningNodeId, setRunningNodeId] = useState<string | null>(null);

  // Fetch Workflow details
  const { data: workflow } = useQuery({
    queryKey: ['workflow', workflowId],
    queryFn: async () => {
      const res = await api.get(`/workflows/${workflowId}`);
      return res.data;
    },
  });

  useEffect(() => {
    if (workflow) {
      setWorkflowName(workflow.name);
      setIsActive(workflow.isActive);
      const rawNodes = Array.isArray(workflow.nodes) ? workflow.nodes : [];
      setNodes(
        rawNodes.map((n: any) => ({
          id: n.id,
          type: 'custom',
          position: n.position || { x: 250, y: 100 },
          data: { label: n.data?.label || n.type, type: n.type, category: getCategory(n.type), config: n.data?.config },
        })),
      );
      setEdges(Array.isArray(workflow.edges) ? workflow.edges : []);
    }
  }, [workflow]);

  // Socket.IO live run highlighting
  useEffect(() => {
    const socket = getSocket();
    socket.on('workflow:node_start', (data: any) => {
      setRunningNodeId(data.nodeId);
    });
    socket.on('workflow:node_complete', () => {
      setRunningNodeId(null);
    });
    socket.on('workflow:node_error', () => {
      setRunningNodeId(null);
    });
    return () => {
      socket.off('workflow:node_start');
      socket.off('workflow:node_complete');
      socket.off('workflow:node_error');
    };
  }, []);

  function getCategory(type: string) {
    const paletteItem = NODE_PALETTE.find((item) => item.type === type);
    return paletteItem?.category || 'action';
  }

  const onNodesChange = useCallback(
    (changes: any) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );

  const onEdgesChange = useCallback(
    (changes: any) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );

  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge(params, eds)),
    [],
  );

  const addNode = (typeObj: any) => {
    if (nodes.length >= 20) {
      alert('Maximum 20 nodes per workflow reached!');
      return;
    }
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: 'custom',
      position: { x: 300, y: 150 + nodes.length * 60 },
      data: { label: typeObj.label, type: typeObj.type, category: typeObj.category, config: {} },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      return api.put(`/workflows/${workflowId}`, {
        name: workflowName,
        isActive,
        nodes: nodes.map((n) => ({
          id: n.id,
          type: n.data.type,
          position: n.position,
          data: { label: n.data.label, config: n.data.config },
        })),
        edges,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow', workflowId] });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      return api.post(`/workflows/${workflowId}/run`, {
        incomingMessage: 'Test manual flow trigger',
      });
    },
  });

  return (
    <div className="h-screen w-screen flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* Top Toolbar */}
      <div className="h-14 px-5 bg-zinc-900/80 border-b border-zinc-800/80 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <Link href="/workflows" className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">
            <ArrowLeft className="h-4 w-4" />
          </Link>

          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="bg-transparent text-sm font-bold text-zinc-100 focus:outline-none border-b border-transparent focus:border-emerald-500"
          />

          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
            {nodes.length} / 20 Nodes
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Active Switch */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-medium">Active</span>
            <button
              onClick={() => setIsActive(!isActive)}
              className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                isActive ? 'bg-emerald-600' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  isActive ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <button
            onClick={() => runMutation.mutate()}
            className="h-8 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 flex items-center gap-1.5"
          >
            <Play className="h-3.5 w-3.5 text-emerald-400" /> Test Run
          </button>

          <button
            onClick={() => saveMutation.mutate()}
            className="h-8 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white flex items-center gap-1.5"
          >
            <Save className="h-3.5 w-3.5" /> Save Workflow
          </button>
        </div>
      </div>

      {/* Main Canvas Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Draggable Palette */}
        <div className="w-64 border-r border-zinc-800/80 bg-zinc-900/60 p-4 space-y-4 overflow-y-auto z-10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Node Library</span>
            <span className="text-[10px] text-zinc-500">Max 20</span>
          </div>

          <div className="space-y-2">
            {NODE_PALETTE.map((item) => (
              <button
                key={item.type}
                onClick={() => addNode(item)}
                className="w-full p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 text-left flex items-center justify-between text-xs font-medium text-zinc-300 transition-colors"
              >
                <span>{item.label}</span>
                <Plus className="h-3.5 w-3.5 text-zinc-500" />
              </button>
            ))}
          </div>
        </div>

        {/* React Flow Full Bleed Canvas */}
        <div className="flex-1 h-full w-full bg-zinc-950">
          <ReactFlow
            nodes={nodes.map((n) =>
              n.id === runningNodeId
                ? { ...n, className: 'ring-2 ring-emerald-400 animate-pulse' }
                : n,
            )}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_e, node) => setActiveNode(node)}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background color="#27272a" gap={16} />
            <Controls className="bg-zinc-900 border-zinc-800 text-zinc-300 fill-zinc-300" />
          </ReactFlow>
        </div>

        {/* Right Node Config Drawer */}
        {activeNode && (
          <div className="w-80 border-l border-zinc-800/80 bg-zinc-900/90 p-4 space-y-4 z-10 overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <span className="text-xs font-bold text-zinc-200">Configure Node</span>
              <button
                onClick={() => setActiveNode(null)}
                className="text-xs text-zinc-400 hover:text-zinc-200"
              >
                Close
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1 font-medium">Node Label</label>
                <input
                  type="text"
                  value={String(activeNode.data?.label || '')}
                  onChange={(e) => {
                    const newLabel = e.target.value;
                    setNodes((nds) =>
                      nds.map((n) => (n.id === activeNode.id ? { ...n, data: { ...n.data, label: newLabel } } : n)),
                    );
                  }}
                  className="w-full h-8 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {activeNode.data?.type === 'SEND_MESSAGE' && (
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Message Text</label>
                  <textarea
                    rows={3}
                    placeholder="Enter automated text response..."
                    value={String((activeNode.data?.config as any)?.messageText || '')}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNodes((nds) =>
                        nds.map((n) =>
                          n.id === activeNode.id
                            ? { ...n, data: { ...n.data, config: { ...((n.data.config as any) || {}), messageText: val } } }
                            : n,
                        ),
                      );
                    }}
                    className="w-full p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
