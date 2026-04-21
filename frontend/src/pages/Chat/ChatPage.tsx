import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { MessageSquare, Send, Search, CheckCheck, Circle, RefreshCw, X } from 'lucide-react';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface Conversation {
  id: string;
  lead_name: string;
  channel_type: string;
  channel_name: string;
  status: string;
  assigned_name: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

interface Message {
  id: string;
  content: string;
  direction: 'inbound' | 'outbound';
  type: string;
  sender_name: string;
  created_at: string;
}

const CHANNEL_COLORS: Record<string, string> = {
  whatsapp: 'text-green-400',
  instagram: 'text-pink-400',
  email: 'text-blue-400',
  webchat: 'text-purple-400',
};

export default function ChatPage() {
  const { accessToken, user } = useAuthStore();
  const qc = useQueryClient();
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ['conversations', statusFilter],
    queryFn: () => api.get('/chat/conversations', { params: { status: statusFilter || undefined } }).then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: ['messages', activeConv?.id],
    queryFn: () => api.get(`/chat/conversations/${activeConv!.id}/messages`).then(r => r.data),
    enabled: !!activeConv,
  });

  const sendMutation = useMutation({
    mutationFn: (content: string) =>
      api.post(`/chat/conversations/${activeConv!.id}/messages`, { content, type: 'text' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages', activeConv?.id] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
      setDraft('');
    },
    onError: () => toast.error('Erro ao enviar mensagem'),
  });

  const resolveMutation = useMutation({
    mutationFn: () => api.patch(`/chat/conversations/${activeConv!.id}/resolve`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversations'] });
      setActiveConv(null);
      toast.success('Conversa resolvida');
    },
  });

  // Socket.io connection
  useEffect(() => {
    if (!accessToken) return;
    const socket = io('/', {
      auth: { token: accessToken },
      transports: ['websocket'],
    });
    socketRef.current = socket;

    socket.on('message:new', ({ conversationId, message }: { conversationId: string; message: Message }) => {
      qc.setQueryData<Message[]>(['messages', conversationId], (prev = []) => [...prev, message]);
      qc.invalidateQueries({ queryKey: ['conversations'] });
    });

    return () => { socket.disconnect(); };
  }, [accessToken, qc]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const filtered = conversations.filter(c =>
    !search || c.lead_name?.toLowerCase().includes(search.toLowerCase()) || c.last_message?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || !activeConv) return;
    sendMutation.mutate(draft.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as any);
    }
  };

  const formatTime = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    return sameDay
      ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden animate-fade-in">
      {/* Sidebar */}
      <div className="w-80 flex flex-col border-r border-dark-700 bg-dark-800">
        <div className="p-4 border-b border-dark-700">
          <h1 className="text-lg font-bold text-dark-100 flex items-center gap-2 mb-3">
            <MessageSquare size={20} className="text-primary-400" />
            Chat Unificado
          </h1>
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
            <input
              type="text"
              placeholder="Buscar conversas..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm bg-dark-700 border border-dark-600 rounded-lg text-dark-200 placeholder-dark-400 focus:outline-none focus:border-primary-500"
            />
          </div>
          <div className="flex gap-2">
            {['', 'open', 'resolved'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition-colors ${statusFilter === s ? 'bg-primary-500 text-white' : 'bg-dark-700 text-dark-400 hover:bg-dark-600'}`}
              >
                {s === '' ? 'Todos' : s === 'open' ? 'Abertos' : 'Resolvidos'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center h-24">
              <RefreshCw size={20} className="animate-spin text-dark-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-center text-dark-400 text-sm">Nenhuma conversa encontrada</div>
          ) : (
            filtered.map(conv => (
              <button
                key={conv.id}
                onClick={() => setActiveConv(conv)}
                className={`w-full text-left px-4 py-3 border-b border-dark-700 hover:bg-dark-700 transition-colors ${activeConv?.id === conv.id ? 'bg-dark-700' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-400 text-sm font-semibold">
                      {(conv.lead_name || '?')[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-sm font-medium text-dark-100 truncate">{conv.lead_name || 'Desconhecido'}</span>
                      <span className="text-xs text-dark-400 flex-shrink-0 ml-2">{formatTime(conv.last_message_at)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs ${CHANNEL_COLORS[conv.channel_type] || 'text-dark-400'}`}>
                        {conv.channel_name || conv.channel_type || 'web'}
                      </span>
                      <span className="text-dark-500">·</span>
                      <p className="text-xs text-dark-400 truncate">{conv.last_message || 'Sem mensagens'}</p>
                    </div>
                  </div>
                  {conv.status === 'open' && (
                    <Circle size={8} className="text-green-400 fill-green-400 flex-shrink-0 mt-1" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main chat area */}
      {activeConv ? (
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700 bg-dark-800">
            <div>
              <h2 className="font-semibold text-dark-100">{activeConv.lead_name || 'Conversa'}</h2>
              <p className="text-xs text-dark-400">
                {activeConv.channel_name || activeConv.channel_type} · {activeConv.assigned_name ? `Atribuído a ${activeConv.assigned_name}` : 'Não atribuído'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {activeConv.status === 'open' && (
                <button
                  onClick={() => resolveMutation.mutate()}
                  disabled={resolveMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg hover:bg-green-500/20 transition-colors"
                >
                  <CheckCheck size={14} />
                  Resolver
                </button>
              )}
              <button onClick={() => setActiveConv(null)} className="p-1.5 text-dark-400 hover:text-dark-200 rounded-lg hover:bg-dark-700">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-dark-400 text-sm">Sem mensagens ainda</div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] ${msg.direction === 'outbound' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                    {msg.direction === 'inbound' && (
                      <span className="text-xs text-dark-400 px-1">{msg.sender_name || activeConv.lead_name}</span>
                    )}
                    <div className={`px-4 py-2.5 rounded-2xl text-sm ${
                      msg.direction === 'outbound'
                        ? 'bg-primary-600 text-white rounded-tr-sm'
                        : 'bg-dark-700 text-dark-100 rounded-tl-sm'
                    }`}>
                      {msg.content}
                    </div>
                    <span className="text-xs text-dark-500 px-1">{formatTime(msg.created_at)}</span>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-4 border-t border-dark-700 bg-dark-800 flex gap-3">
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite uma mensagem... (Enter para enviar)"
              rows={1}
              className="flex-1 px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-xl text-sm text-dark-100 placeholder-dark-400 focus:outline-none focus:border-primary-500 resize-none"
              style={{ minHeight: '42px', maxHeight: '120px' }}
            />
            <button
              type="submit"
              disabled={!draft.trim() || sendMutation.isPending}
              className="px-4 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center gap-2"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={32} className="text-primary-400" />
            </div>
            <h3 className="text-lg font-semibold text-dark-100 mb-2">Selecione uma conversa</h3>
            <p className="text-dark-400 text-sm">Escolha uma conversa na lista para começar o atendimento</p>
          </div>
        </div>
      )}
    </div>
  );
}
