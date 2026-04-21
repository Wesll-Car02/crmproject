import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Plus, Send, Trash2, Eye, X, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface Proposal {
  id: string;
  number: string;
  title: string;
  status: string;
  total_value: number;
  valid_until: string;
  sent_at: string;
  created_at: string;
  created_by_name: string;
  opportunity_title: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  draft: { label: 'Rascunho', color: 'bg-dark-600 text-dark-300', icon: FileText },
  sent: { label: 'Enviada', color: 'bg-blue-500/10 text-blue-400', icon: Send },
  viewed: { label: 'Visualizada', color: 'bg-purple-500/10 text-purple-400', icon: Eye },
  accepted: { label: 'Aceita', color: 'bg-green-500/10 text-green-400', icon: CheckCircle },
  rejected: { label: 'Rejeitada', color: 'bg-red-500/10 text-red-400', icon: AlertCircle },
  expired: { label: 'Expirada', color: 'bg-orange-500/10 text-orange-400', icon: Clock },
};

function NewProposalModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: '', opportunityId: '', totalValue: '', validUntil: '' });

  const mutation = useMutation({
    mutationFn: () => api.post('/proposals', {
      title: form.title,
      opportunityId: form.opportunityId || null,
      totalValue: parseFloat(form.totalValue) || 0,
      validUntil: form.validUntil || null,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proposals'] });
      toast.success('Proposta criada!');
      onClose();
    },
  });

  const { data: opportunities = [] } = useQuery({
    queryKey: ['opportunities-simple'],
    queryFn: () => api.get('/opportunities').then(r => r.data?.data || r.data || []),
  });

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="glass-card w-full max-w-lg">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-dark-100">Nova Proposta</h2>
          <button onClick={onClose} className="text-dark-400 hover:text-dark-200"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-dark-300 mb-1">Título *</label>
            <input
              className="input-field w-full"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              placeholder="Ex: Proposta de Software CRM"
            />
          </div>
          <div>
            <label className="block text-sm text-dark-300 mb-1">Oportunidade (opcional)</label>
            <select className="input-field w-full" value={form.opportunityId} onChange={e => setForm(p => ({ ...p, opportunityId: e.target.value }))}>
              <option value="">Nenhuma</option>
              {opportunities.map((o: any) => (
                <option key={o.id} value={o.id}>{o.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-dark-300 mb-1">Valor Total (R$)</label>
            <input
              type="number"
              className="input-field w-full"
              value={form.totalValue}
              onChange={e => setForm(p => ({ ...p, totalValue: e.target.value }))}
              placeholder="0,00"
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm text-dark-300 mb-1">Válida até</label>
            <input
              type="date"
              className="input-field w-full"
              value={form.validUntil}
              onChange={e => setForm(p => ({ ...p, validUntil: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-ghost flex-1">Cancelar</button>
          <button
            onClick={() => mutation.mutate()}
            disabled={!form.title || mutation.isPending}
            className="btn-primary flex-1 disabled:opacity-50"
          >
            {mutation.isPending ? 'Criando...' : 'Criar Proposta'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProposalsPage() {
  const qc = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const { data: proposals = [], isLoading } = useQuery<Proposal[]>({
    queryKey: ['proposals', statusFilter],
    queryFn: () => api.get('/proposals', { params: { status: statusFilter || undefined } }).then(r => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/proposals/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['proposals'] }); toast.success('Proposta excluída'); },
  });

  const sendMutation = useMutation({
    mutationFn: (id: string) => api.post(`/proposals/${id}/send`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['proposals'] }); toast.success('Proposta enviada!'); },
  });

  const formatCurrency = (v: number) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const formatDate = (iso: string) => iso ? new Date(iso).toLocaleDateString('pt-BR') : '—';

  const isExpired = (p: Proposal) => p.valid_until && new Date(p.valid_until) < new Date() && p.status !== 'accepted';

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-500/10 flex items-center justify-center">
              <FileText size={20} className="text-primary-400" />
            </div>
            Propostas
          </h1>
          <p className="page-subtitle">Propostas comerciais</p>
        </div>
        <button onClick={() => setShowNew(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nova Proposta
        </button>
      </div>

      {/* Status filter */}
      <div className="glass-card p-4 flex gap-2 flex-wrap">
        {['', 'draft', 'sent', 'accepted', 'rejected'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${statusFilter === s ? 'bg-primary-500 text-white' : 'bg-dark-700 text-dark-400 hover:bg-dark-600'}`}
          >
            {s === '' ? 'Todas' : STATUS_CONFIG[s]?.label || s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-700">
              <th className="text-left px-4 py-3 text-xs font-medium text-dark-400 uppercase">Número</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-dark-400 uppercase">Título</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-dark-400 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-dark-400 uppercase">Valor</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-dark-400 uppercase">Validade</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-dark-400 uppercase">Criado por</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-dark-400 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-dark-400">Carregando...</td></tr>
            ) : proposals.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-dark-400">Nenhuma proposta encontrada</td></tr>
            ) : proposals.map(p => {
              const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.draft;
              const expired = isExpired(p);
              return (
                <tr key={p.id} className="border-b border-dark-700/50 hover:bg-dark-700/30">
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono text-primary-400">{p.number}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-dark-100">{p.title}</p>
                    {p.opportunity_title && <p className="text-xs text-dark-400">{p.opportunity_title}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full font-medium ${expired ? 'bg-orange-500/10 text-orange-400' : cfg.color}`}>
                      {expired ? 'Expirada' : cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-dark-100">{formatCurrency(p.total_value)}</td>
                  <td className="px-4 py-3 text-sm text-dark-300">{formatDate(p.valid_until)}</td>
                  <td className="px-4 py-3 text-sm text-dark-300">{p.created_by_name || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {p.status === 'draft' && (
                        <button
                          onClick={() => sendMutation.mutate(p.id)}
                          className="p-1.5 text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="Enviar"
                        >
                          <Send size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => { if (confirm('Excluir proposta?')) deleteMutation.mutate(p.id); }}
                        className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showNew && <NewProposalModal onClose={() => setShowNew(false)} />}
    </div>
  );
}
