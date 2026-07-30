'use client';

import React from 'react';
import { Bot } from 'lucide-react';
import { Badge } from '@openreach/ui';

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">AI Support Agents</h1>
          <p className="text-sm text-zinc-400">Configure autonomous agents linked to custom prompts and business hours.</p>
        </div>
        <Badge variant="secondary">Phase 2 Module</Badge>
      </div>

      <div className="p-12 text-center rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-800 space-y-4 max-w-2xl mx-auto">
        <div className="h-12 w-12 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
          <Bot className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-zinc-200">AI Agents Stubs Configured</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            The `Agent` schema table is ready. In Phase 1, auto-replies are handled directly via Prompt Studio & Conversation AI Toggles.
          </p>
        </div>
      </div>
    </div>
  );
}
