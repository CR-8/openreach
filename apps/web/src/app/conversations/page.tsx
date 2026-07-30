'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api';
import { getSocket } from '../../lib/socket';
import { Search, Send, Paperclip, Bot, User, MessageSquare, AlertCircle, RefreshCw } from 'lucide-react';
import { Badge } from '@openreach/ui';

export default function ConversationsPage() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [messageText, setMessageText] = useState('');

  // Fetch Conversations List
  const { data: conversations = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const res = await api.get('/conversations');
      return res.data;
    },
  });

  // Automatically select first conversation if none selected
  useEffect(() => {
    if (conversations.length > 0 && !selectedId) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

  const activeConversation = conversations.find((c: any) => c.id === selectedId);

  // Fetch Message Thread for selected conversation
  const { data: messages = [], isLoading: isMessagesLoading, isError: isMessagesError } = useQuery({
    queryKey: ['messages', selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      const res = await api.get(`/conversations/${selectedId}/messages`);
      return res.data;
    },
    enabled: !!selectedId,
  });

  // Socket.IO realtime message listener
  useEffect(() => {
    const socket = getSocket();
    socket.on('message:created', () => {
      queryClient.invalidateQueries({ queryKey: ['messages', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });
    return () => {
      socket.off('message:created');
    };
  }, [selectedId, queryClient]);

  // Send Message Mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (text: string) => {
      return api.post(`/conversations/${selectedId}/messages`, { content: text });
    },
    onSuccess: () => {
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['messages', selectedId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  // Toggle AI Mutation
  const toggleAiMutation = useMutation({
    mutationFn: async (aiEnabled: boolean) => {
      return api.patch(`/conversations/${selectedId}/ai-toggle`, { aiEnabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedId) return;
    sendMessageMutation.mutate(messageText);
  };

  const filteredConversations = conversations.filter((c: any) => {
    const query = search.toLowerCase();
    return (
      c.contact?.name?.toLowerCase().includes(query) ||
      c.contact?.phone?.includes(query)
    );
  });

  return (
    <div className="h-[calc(100vh-6.5rem)] flex rounded-xl border border-zinc-800/80 bg-zinc-900/60 overflow-hidden">
      {/* Pane 1: Conversations List */}
      <div className="w-80 border-r border-zinc-800/80 flex flex-col bg-zinc-950/40">
        {/* Search Header */}
        <div className="p-3 border-b border-zinc-800/80 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search chats..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
            />
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 rounded-lg bg-zinc-900/60 animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          /* Error State */
          <div className="p-4 text-center space-y-2 text-xs text-red-400">
            <AlertCircle className="h-5 w-5 mx-auto" />
            <p>Failed to load chats</p>
            <button onClick={() => refetch()} className="px-2 py-1 rounded bg-zinc-800 text-zinc-300">
              Retry
            </button>
          </div>
        ) : conversations.length === 0 ? (
          /* Empty State */
          <div className="flex-1 p-6 text-center flex flex-col items-center justify-center space-y-2 text-xs text-zinc-500">
            <MessageSquare className="h-8 w-8 text-zinc-600" />
            <p className="font-semibold text-zinc-400">No Chats Found</p>
            <p className="text-[11px] text-zinc-600">Connect a WhatsApp session to start receiving inbound messages.</p>
          </div>
        ) : (
          /* Conversation List */
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/40">
            {filteredConversations.map((c: any) => {
              const isSelected = c.id === selectedId;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                    isSelected ? 'bg-zinc-800/80 border-l-2 border-emerald-500' : 'hover:bg-zinc-800/30'
                  }`}
                >
                  <div className="h-9 w-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-emerald-400 shrink-0">
                    {c.contact?.name?.charAt(0) || 'C'}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-zinc-200 truncate">
                        {c.contact?.name || c.contact?.phone}
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {new Date(c.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 truncate">
                      {c.messages?.[0]?.content || 'No messages'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pane 2: Message Thread & Composer */}
      <div className="flex-1 flex flex-col bg-zinc-900/40">
        {activeConversation ? (
          <>
            {/* Header / AI Toggle Switch */}
            <div className="h-14 px-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/60">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xs text-emerald-400">
                  {activeConversation.contact?.name?.charAt(0) || 'C'}
                </div>
                <div>
                  <h2 className="text-xs font-bold text-zinc-200">
                    {activeConversation.contact?.name || activeConversation.contact?.phone}
                  </h2>
                  <p className="text-[10px] text-zinc-500">{activeConversation.contact?.phone}</p>
                </div>
              </div>

              {/* AI Switch */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 font-medium">AI Auto-Reply</span>
                <button
                  onClick={() => toggleAiMutation.mutate(!activeConversation.aiEnabled)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                    activeConversation.aiEnabled ? 'bg-emerald-600' : 'bg-zinc-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      activeConversation.aiEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Message Thread */}
            <div className="flex-1 p-5 overflow-y-auto space-y-3">
              {isMessagesLoading ? (
                <div className="p-8 text-center text-xs text-zinc-500">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500">No message history yet. Type a message below to start.</div>
              ) : (
                messages.map((m: any) => {
                  const isInbound = m.direction === 'INBOUND';
                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isInbound ? 'items-start' : 'items-end'}`}
                    >
                      <div
                        className={`max-w-lg px-4 py-2.5 rounded-2xl text-xs space-y-1 ${
                          isInbound
                            ? 'bg-zinc-800 text-zinc-100 rounded-tl-sm'
                            : 'bg-emerald-600 text-white rounded-tr-sm'
                        }`}
                      >
                        {m.aiGenerated && (
                          <div className="flex items-center gap-1 text-[10px] opacity-80 font-semibold mb-1">
                            <Bot className="h-3 w-3" /> AI Generated
                          </div>
                        )}
                        <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                        <div className="text-[9px] opacity-60 text-right">
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Composer */}
            <form onSubmit={handleSend} className="p-3 border-t border-zinc-800/80 bg-zinc-900/60 flex items-center gap-2">
              <button
                type="button"
                className="p-2 rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <input
                type="text"
                placeholder="Type your message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                className="flex-1 h-10 px-4 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 placeholder-zinc-600"
              />
              <button
                type="submit"
                disabled={!messageText.trim() || sendMessageMutation.isPending}
                className="h-10 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Send className="h-3.5 w-3.5" /> Send
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-2 text-zinc-500">
            <MessageSquare className="h-8 w-8 text-zinc-600" />
            <p className="text-xs font-semibold text-zinc-400">No Chat Selected</p>
            <p className="text-[11px] text-zinc-600">Select a conversation from the left pane to begin messaging.</p>
          </div>
        )}
      </div>

      {/* Pane 3: Contact Details */}
      {activeConversation && (
        <div className="w-72 border-l border-zinc-800/80 p-4 bg-zinc-950/40 space-y-6">
          <div className="text-center space-y-2">
            <div className="h-16 w-16 mx-auto rounded-full bg-zinc-800 border-2 border-emerald-500/30 flex items-center justify-center font-bold text-lg text-emerald-400">
              {activeConversation.contact?.name?.charAt(0) || 'C'}
            </div>
            <h3 className="text-sm font-bold text-zinc-100">
              {activeConversation.contact?.name || activeConversation.contact?.phone}
            </h3>
            <p className="text-xs text-zinc-400">{activeConversation.contact?.phone}</p>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Details</div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-zinc-800/60 text-zinc-400">
                <span>Status</span>
                <span className="text-emerald-400 font-medium">{activeConversation.status || 'OPEN'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60 text-zinc-400">
                <span>Session ID</span>
                <span className="text-zinc-200 truncate max-w-[120px]">{activeConversation.contact?.sessionId || 'default'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
