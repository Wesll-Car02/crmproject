import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Megaphone, Plus, Send, Mail, MessageCircle, BarChart2, Trash2, X } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface Campaign {
  id: string;
  name: string;
  type: string;
  subject: string;
  status: string;
  sent_count: number;
  opened_count: number;
  scheduled_at: string;
  created_at: string;
  created_by_name: string;
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-dark-600 text-dark-300',
  scheduled: 'bg-yellow-500/10 text-yellow-400',
  sending: 'bg-blue-500/10 text-blue-400',
  sent: 'bg-green-500/10 text-green-400',
  paused: 'bg-orange-500/10 text-orange-400',
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  scheduled: 'Agendada',
  sending: 'Enviando',
  sent: 'Enviada',
  paused: 'Pausada',
};

function NewCampaignModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', type: 'email', subject: '', content: '', scheduledAt: '' });

  const mutation = useMutation({
    mutationFn: () => api.post('/campaigns', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['campaigns'] });
      toast.success('Campanha criada!');
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-dark-100">Nova Campanha</h2>
          <button onClick={onClose} className="text-dark-400 hover:text-dark-200"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-dark-300 mb-1">Nome da Campanha *</label>
            <input
              className="input-field w-full"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Ex: Promoção de Janeiro"
            />
          </div>
          <div>
            <label className="block text-sm text-dark-300 mb-1">Canal</label>
            <select className="input-field w-full" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
              <option value="email">E-mail</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="sms">SMS</option>
            </select>
          </div>
          {form.type === 'email' && (
            <div>
              <label className="block text-sm text-dark-300 mb-1">Assunto</label>
              <input
                className="input-field w-full"
                value={form.subject}
                onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                placeholder="Assunto do e-mail"
              />
            </div>
          )}
          <div>
            <label className="block text-sm text-dark-300 mb-1">Conteúdo *</label>
            <textarea
              className="input-field w-full h-32 resize-none"
              value={form.content}
              onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
              placeholder="Mensagem da campanha..."
            />
          </div>
          <div>
            <label className="block text-sm text-dark-300 mb-1">Agendamento (opcional)</label>
            <input
              type="datetime-local"
              className="input-field w-full"
              value={form.scheduledAt}
              onChange={e => setForm(p => ({ ...p, scheduledAt: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!form.name || !form.content || mutation.isPending}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {mutation.isPending ? 'Criando...' : 'Criar Campanha'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const { data: campaigns = [], isLoading } = useQuery<Campaign[]>({
    queryKey: ['campaigns', statusFilter],
    queryFn: () => api.get('/campaigns', { params: { status: statusFilter || undefined } }).then(r => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['campaigns-stats'],
    queryFn: () => api.get('/campaigns/stats').then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/campaigns/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('Campanha excluída'); },
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/campaigns/${id}`, { status: 'sending' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['campaigns'] }); toast.success('Campanha enviada!'); },
  });

  const formatDate = (iso: string) => iso ? new Date(iso).toLocaleDateString('pt-BR') : '—';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-500/10 flex items-center justify-center">
              <Megaphone size={20} className="text-primary-400" />
            </div>
            Campanhas
          </h1>
          <p className="page-subtitle">Marketing multicanal</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nova Campanha
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total || 0, icon: Megaphone },
            { label: 'Enviadas', value: stats.sent || 0, icon: Send },
            { label: 'Msgs Enviadas', value: Number(stats.total_sent || 0).toLocaleString('pt-BR'), icon: Mail },
            { label: 'Abertas', value: Number(stats.total_opened || 0).toLocaleString('pt-BR'), icon: BarChart2 },
          ].map(s => (
            <div key={s.label} className="glass-card p-4 flex items-center gap-3">
              <s.icon size={20} className="text-primary-400" />
              <div>
                <p className="text-xs text-dark-400">{s.label}</p>
                <p className="text-xl font-bold text-dark-100">{s.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="glass-card p-4 flex gap-2 flex-wrap">
        {['', 'draft', 'scheduled', 'sent'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${statusFilter === s ? 'bg-primary-500 text-white' : 'bg-dark-700 text-dark-400 hover:bg-dark-600'}`}
          >
            {s === '' ? 'Todos' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-700">
              <th className="text-left px-4 py-3 text-xs font-medium text-dark-400 uppercase">Campanha</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-dark-400 uppercase">Canal</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-dark-400 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-dark-400 uppercase">Enviados</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-dark-400 uppercase">Agendamento</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-dark-400 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-dark-400">Carregando...</td></tr>
            ) : campaigns.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-dark-400">Nenhuma campanha encontrada</td></tr>
            ) : campaigns.map(c => (
              <tr key={c.id} className="border-b border-dark-700/50 hover:bg-dark-700/30">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-dark-100">{c.name}</p>
                  {c.subject && <p className="text-xs text-dark-400">{c.subject}</p>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {c.type === 'email' ? <Mail size={14} className="text-blue-400" /> : <MessageCircle size={14} className="text-green-400" />}
                    <span className="text-sm text-dark-300 capitalize">{c.type}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_COLORS[c.status] || 'bg-dark-600 text-dark-300'}`}>
                    {STATUS_LABELS[c.status] || c.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-dark-300">{Number(c.sent_count || 0).toLocaleString('pt-BR')}</td>
                <td className="px-4 py-3 text-sm text-dark-300">{c.scheduled_at ? formatDate(c.scheduled_at) : '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {c.status === 'draft' && (
                      <button
                        onClick={() => sendMutation.mutate(c.id)}
                        className="p-1.5 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                        title="Enviar"
                      >
                        <Send size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => { if (confirm('Excluir campanha?')) deleteMutation.mutate(c.id); }}
                      className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNew && <NewCampaignModal onClose={() => setShowNew(false)} />}
    </div>
  );
}
