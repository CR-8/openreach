'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquare,
  GitFork,
  Radio,
  Bot,
  Sparkles,
  BookOpen,
  BarChart3,
  Settings,
  LogOut,
  Search,
  ChevronDown,
  Building2,
  Menu,
  X,
} from 'lucide-react';
import { useAuthStore } from '../lib/auth-store';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Conversations', href: '/conversations', icon: MessageSquare },
  { label: 'Workflows', href: '/workflows', icon: GitFork },
  { label: 'Campaigns', href: '/campaigns', icon: Radio },
  { label: 'Agents', href: '/agents', icon: Bot },
  { label: 'Prompts', href: '/prompts', icon: Sparkles },
  { label: 'Knowledge Base', href: '/knowledge', icon: BookOpen },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  const isWorkflowCanvas = pathname.startsWith('/workflows/');

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Left Sidebar */}
      <aside
        className={`flex flex-col border-r border-zinc-800/80 bg-zinc-900/60 transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Brand Logo */}
        <div className="flex h-14 items-center justify-between px-4 border-b border-zinc-800/80">
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2 font-bold text-lg text-emerald-400">
              <span className="h-6 w-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                O
              </span>
              OpenReach
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
          >
            {collapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="p-3 border-t border-zinc-800/80 flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs font-semibold text-zinc-300">
                {user?.name?.charAt(0) || 'A'}
              </div>
              <div className="flex flex-col text-xs truncate">
                <span className="font-semibold text-zinc-200 truncate">{user?.name || 'Admin User'}</span>
                <span className="text-zinc-500 truncate">{user?.email || 'admin@openreach.io'}</span>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-red-400"
            title="Log Out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-14 items-center justify-between border-b border-zinc-800/80 bg-zinc-900/40 px-6">
          <div className="flex items-center gap-4">
            {/* Org Switcher */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-300">
              <Building2 className="h-4 w-4 text-emerald-400" />
              <span>Primary Workspace</span>
              <ChevronDown className="h-3 w-3 text-zinc-500" />
            </div>

            {/* Cmd+K Palette Trigger */}
            <div className="relative flex items-center">
              <Search className="absolute left-3 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search conversations, workflows... (Cmd+K)"
                className="h-8 w-64 rounded-lg bg-zinc-900 pl-9 pr-4 text-xs text-zinc-300 border border-zinc-800 focus:outline-none focus:border-zinc-700 placeholder-zinc-600"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              WhatsApp Online
            </span>
          </div>
        </header>

        {/* Page Content container */}
        <main className={`flex-1 overflow-auto ${isWorkflowCanvas ? 'p-0' : 'p-6'}`}>
          <div className={isWorkflowCanvas ? 'h-full w-full' : 'max-w-7xl mx-auto space-y-6'}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
