'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../lib/api';
import { useAuthStore } from '../../lib/auth-store';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/register', {
        name,
        email,
        password,
        organizationName,
      });
      setAuth(res.data.user, res.data.accessToken, res.data.refreshToken);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-zinc-950 text-zinc-100">
      <div className="w-full max-w-md p-8 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="h-10 w-10 mx-auto rounded-xl bg-emerald-500/20 text-emerald-400 font-extrabold text-xl flex items-center justify-center border border-emerald-500/30">
            O
          </div>
          <h1 className="text-xl font-bold text-zinc-100">Register Organization</h1>
          <p className="text-xs text-zinc-400">Set up your admin account and primary workspace.</p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-zinc-400 mb-1 font-medium">Organization Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Acme Corp"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-medium">Your Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-medium">Email Address</label>
            <input
              type="email"
              required
              placeholder="admin@acme.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-zinc-400 mb-1 font-medium">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-10 px-3 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-100 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Register Workspace'}
          </button>
        </form>

        <div className="text-center text-xs text-zinc-500">
          Already registered?{' '}
          <Link href="/login" className="text-emerald-400 hover:underline">
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
