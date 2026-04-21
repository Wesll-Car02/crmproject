import React, { useState, useCallback } from 'react';
import {
  Users, Search, Filter, Plus, UserPlus, FileDown, MoreVertical,
  Star, Inbox, Flame, Target, LayoutGrid, LayoutList, X, Phone,
  Mail, Building2, GripVertical, ChevronDown
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quickExportLeads, advancedExportLeads } from '../../utils/exportUtils';
import {
  DndContext, closestCorners, PointerSensor, useSensor, useSensors, DragEndEvent,
  DragOverlay, useDroppable, DragStartEvent, defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import toast from 'react-hot-toast';
import api from '../../lib/api';

const LEAD_STATUSES = [
  { id: 'new', label: 'Novo', color: 'cyan' },
  { id: 'contacted', label: 'Em Contato', color: 'blue' },
  { id: 'qualified', label: 'Qualificado', color: 'emerald' },
  { id: 'converted', label: 'Convertido', color: 'purple' },
  { id: 'cold', label: 'Frio', color: 'slate' },
];

const STATUS_LABELS: Record<string, string> = {
  new: 'Novo', contacted: 'Em Contato', qualified: 'Qualificado',
  converted: 'Convertido', cold: 'Frio', lost: 'Perdido',
};

const STATUS_COLORS: Record<string, string> = {
  new: 'cyan', contacted: 'blue', qualified: 'emerald', converted: 'purple', cold: 'slate', lost: 'rose',
};

// Helper functions for dynamic column styling
function getColumnBorderClass(color: string): string {
  const borderClasses: Record<string, string> = {
    cyan: 'border-cyan-500/20 hover:border-cyan-500/40',
    blue: 'border-blue-500/20 hover:border-blue-500/40',
    emerald: 'border-emerald-500/20 hover:border-emerald-500/40',
    purple: 'border-purple-500/20 hover:border-purple-500/40',
    slate: 'border-slate-500/20 hover:border-slate-500/40',
    rose: 'border-rose-500/20 hover:border-rose-500/40',
    indigo: 'border-indigo-500/20 hover:border-indigo-500/40',
  };
  return borderClasses[color] || 'border-dark-700/20 hover:border-dark-600/40';
}

function getColumnHeaderClass(color: string): string {
  const headerClasses: Record<string, string> = {
    cyan: 'border-cyan-500/20 bg-cyan-500/5',
    blue: 'border-blue-500/20 bg-blue-500/5',
    emerald: 'border-emerald-500/20 bg-emerald-500/5',
    purple: 'border-purple-500/20 bg-purple-500/5',
    slate: 'border-slate-500/20 bg-slate-500/5',
    rose: 'border-rose-500/20 bg-rose-500/5',
    indigo: 'border-indigo-500/20 bg-indigo-500/5',
  };
  return headerClasses[color] || 'border-dark-700/20 bg-dark-800/10';
}

function getColumnDotClass(color: string): string {
  const dotClasses: Record<string, string> = {
    cyan: 'bg-cyan-500',
    blue: 'bg-blue-500',
    emerald: 'bg-emerald-500',
    purple: 'bg-purple-500',
    slate: 'bg-slate-500',
    rose: 'bg-rose-500',
    indigo: 'bg-indigo-500',
  };
  return dotClasses[color] || 'bg-dark-500';
}

// Helper functions for KPI card styling
function getKpiBlurClass(color: string): string {
  const blurClasses: Record<string, string> = {
    indigo: 'bg-indigo-500/10 group-hover:bg-indigo-500/20',
    blue: 'bg-blue-500/10 group-hover:bg-blue-500/20',
    rose: 'bg-rose-500/10 group-hover:bg-rose-500/20',
    emerald: 'bg-emerald-500/10 group-hover:bg-emerald-500/20',
    cyan: 'bg-cyan-500/10 group-hover:bg-cyan-500/20',
    purple: 'bg-purple-500/10 group-hover:bg-purple-500/20',
    slate: 'bg-slate-500/10 group-hover:bg-slate-500/20',
  };
  return blurClasses[color] || 'bg-dark-500/10 group-hover:bg-dark-500/20';
}

function getKpiIconClass(color: string): string {
  const iconClasses: Record<string, string> = {
    indigo: 'bg-indigo-500/10 text-indigo-400',
    blue: 'bg-blue-500/10 text-blue-400',
    rose: 'bg-rose-500/10 text-rose-400',
    emerald: 'bg-emerald-500/10 text-emerald-400',
    cyan: 'bg-cyan-500/10 text-cyan-400',
    purple: 'bg-purple-500/10 text-purple-400',
    slate: 'bg-slate-500/10 text-slate-400',
  };
  return iconClasses[color] || 'bg-dark-500/10 text-dark-400';
}

function getKpiTextClass(color: string): string {
  const textClasses: Record<string, string> = {
    indigo: 'text-indigo-400',
    blue: 'text-blue-400',
    rose: 'text-rose-400',
    emerald: 'text-emerald-400',
    cyan: 'text-cyan-400',
    purple: 'text-purple-400',
    slate: 'text-slate-400',
  };
  return textClasses[color] || 'text-dark-400';
}

// Helper function for status badge styling
function getStatusBadgeClass(color: string): string {
  const badgeClasses: Record<string, string> = {
    cyan: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-400',
    blue: 'border-blue-500/20 bg-blue-500/10 text-blue-400',
    emerald: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
    purple: 'border-purple-500/20 bg-purple-500/10 text-purple-400',
    slate: 'border-slate-500/20 bg-slate-500/10 text-slate-400',
    rose: 'border-rose-500/20 bg-rose-500/10 text-rose-400',
    indigo: 'border-indigo-500/20 bg-indigo-500/10 text-indigo-400',
  };
  return badgeClasses[color] || 'border-dark-700/20 bg-dark-800/10 text-dark-400';
}

function ScoreBadge({ score }: { score: number }) {
  if (score >= 80) return <span className="flex items-center gap-1 text-rose-400 font-semibold text-sm"><Flame size={14} />{score}</span>;
  if (score >= 50) return <span className="flex items-center gap-1 text-amber-400 font-semibold text-sm"><Star size={14} />{score}</span>;
  return <span className="flex items-center gap-1 text-emerald-400 font-semibold text-sm"><Target size={14} />{score}</span>;
}

function TagBadge({ tag }: { tag: any }) {
  const style = tag.color ? { backgroundColor: tag.color + '22', color: tag.color, borderColor: tag.color + '44' } : undefined;
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap" style={style}>
      {tag.name || tag}
    </span>
  );
}

// ─── Kanban Column ───────────────────────────────────────────────────────────

function KanbanColumn({ col, colLeads }: { col: any; colLeads: any[] }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `droppable-${col.id}`,
  });

  return (
    <div className="w-[300px] flex flex-col flex-shrink-0 transition-all duration-300">
      <div className={`p-3 mb-3 rounded-xl ${getColumnHeaderClass(col.color)} flex justify-between items-center transition-all duration-300 ${isOver ? 'scale-105 shadow-lg' : ''}`}>
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${getColumnDotClass(col.color)} animate-pulse`} />
          <h3 className="font-semibold text-dark-100 text-sm">{col.label}</h3>
          <span className={`text-xs font-semibold text-dark-400 bg-dark-800 px-2 py-0.5 rounded-full border border-dark-700 transition-all duration-300 ${isOver ? 'scale-110' : ''}`}>
            {colLeads.length}
          </span>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 bg-dark-800/10 rounded-xl p-2 border border-dashed transition-all duration-300
          ${isOver
            ? 'border-indigo-500 bg-indigo-500/5 shadow-indigo-500/20 scale-[1.02]'
            : getColumnBorderClass(col.color)
          }
          min-h-[400px] flex flex-col gap-2 relative`}
      >
        {colLeads.length === 0 && !isOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-sm text-dark-600 p-4">
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-dark-600 flex items-center justify-center mb-2">
              <GripVertical size={20} className="text-dark-500" />
            </div>
            <p className="text-center">Arraste leads para cá</p>
            <p className="text-xs text-dark-500 mt-1">Solte para mover</p>
          </div>
        )}
        {isOver && colLeads.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full h-20 border-2 border-dashed border-indigo-500 rounded-lg bg-indigo-500/10 flex items-center justify-center">
              <p className="text-indigo-400 font-medium">Solte aqui</p>
            </div>
          </div>
        )}
        <SortableContext items={colLeads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          <div className={`flex flex-col gap-2 transition-all duration-300 ${isOver ? 'opacity-70' : ''}`}>
            {colLeads.map(lead => <KanbanLeadCard key={lead.id} lead={lead} />)}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

// ─── Kanban Card ─────────────────────────────────────────────────────────────

function KanbanLeadCard({ lead }: { lead: any }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: lead.id,
    transition: {
      duration: 250, // Animação mais suave
      easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)'
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    scale: isDragging ? 1.02 : 1,
    zIndex: isDragging ? 999 : 'auto'
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`glass-card p-4 border relative group hover:border-dark-500 transition-all duration-200 ease-out cursor-grab active:cursor-grabbing
        ${isDragging
          ? 'border-indigo-500 shadow-indigo-500/30 shadow-xl scale-105 rotate-1'
          : 'border-white/5 hover:scale-[1.02] hover:shadow-lg'
        }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="absolute top-3 right-2 text-dark-500 hover:text-indigo-400 pb-2 pl-2 transition-colors cursor-grab active:cursor-grabbing"
      >
        <GripVertical size={14} className="opacity-60 group-hover:opacity-100 transition-opacity" />
      </div>

      <div className="font-semibold text-dark-100 text-sm pr-6 mb-0.5">{lead.name}</div>
      <div className="text-xs text-dark-400 mb-3">{lead.company}</div>

      <div className="flex flex-wrap gap-1 mb-3">
        {(lead.tags || []).slice(0, 3).map((tag: any, i: number) => (
          <TagBadge key={i} tag={tag} />
        ))}
      </div>

      <div className="flex justify-between items-center pt-2 border-t border-dark-700/50">
        <ScoreBadge score={lead.score || 0} />
        <div className="text-xs text-dark-500">{lead.owner_name?.split(' ')[0] || '—'}</div>
      </div>
    </div>
  );
}

// ─── New Lead Modal ───────────────────────────────────────────────────────────

function NewLeadModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', source: 'manual', status: 'new' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Nome é obrigatório'); return; }
    setLoading(true);
    try {
      await api.post('/leads', form);
      toast.success('Lead criado com sucesso!');
      onCreated();
      onClose();
      setForm({ name: '', company: '', email: '', phone: '', source: 'manual', status: 'new' });
    } catch { /* toast shown by interceptor */ } finally { setLoading(false); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-dark-100">Novo Lead</h2>
          <button onClick={onClose} className="text-dark-400 hover:text-white"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-dark-400 font-medium mb-1 block">Nome *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Nome do lead" required />
          </div>
          <div>
            <label className="text-xs text-dark-400 font-medium mb-1 block">Empresa</label>
            <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Empresa" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-dark-400 font-medium mb-1 block">E-mail</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="email@..." />
            </div>
            <div>
              <label className="text-xs text-dark-400 font-medium mb-1 block">Telefone</label>
              <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="+55 11..." />
            </div>
          </div>
          <div>
            <label className="text-xs text-dark-400 font-medium mb-1 block">Origem</label>
            <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-indigo-500">
              <option value="manual">Manual</option>
              <option value="website">Site</option>
              <option value="referral">Indicação</option>
              <option value="meta_ads">Meta Ads</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">E-mail</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-dark-700 text-dark-300 hover:bg-dark-800 transition-colors text-sm">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium text-sm disabled:opacity-50 transition-colors">
              {loading ? 'Criando...' : 'Criar Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [activeStatus, setActiveStatus] = useState('');
  const [search, setSearch] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);

  const queryClient = useQueryClient();

  const { data: leadsData, isLoading } = useQuery({
    queryKey: ['leads', activeStatus, search],
    queryFn: () => api.get('/leads', { params: { status: activeStatus || undefined, search: search || undefined } }).then(r => r.data),
  });

  const { data: statsData } = useQuery({
    queryKey: ['leads-stats'],
    queryFn: () => api.get('/leads/stats').then(r => r.data),
  });

  const leads: any[] = leadsData?.data || leadsData || [];
  const stats = statsData || {};

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => api.put(`/leads/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['leads'] }),
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Aumentar distância para evitar arrastes acidentais
      },
    })
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setIsDragging(true);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setIsDragging(false);

    if (!over) return;

    const lead = leads.find(l => l.id === active.id);
    if (!lead) return;

    // O over.id pode ser o ID do lead ou do container da coluna
    // Precisamos determinar para qual coluna o lead foi arrastado
    let newStatus = '';

    // Verifica se o over.id corresponde a um status
    if (LEAD_STATUSES.find(s => s.id === over.id)) {
      newStatus = over.id as string;
    } else {
      // Se não for um status, pode ser o container da coluna
      // Vamos verificar se é um lead (se sim, não mudamos o status)
      const isLead = leads.find(l => l.id === over.id);
      if (isLead) {
        // Se foi solto sobre outro lead, mantém no mesmo status
        return;
      }

      // Se não é um lead, pode ser o container da coluna
      // Vamos tentar encontrar a coluna pelo ID do container
      // Os containers das colunas têm IDs como "droppable-new", "droppable-contacted", etc.
      const statusMatch = over.id.toString().match(/droppable-(.+)/);
      if (statusMatch) {
        newStatus = statusMatch[1];
      } else {
        return;
      }
    }

    if (lead.status !== newStatus) {
      updateMutation.mutate({ id: lead.id, status: newStatus });
    }
  }, [leads, updateMutation]);

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setIsDragging(false);
  }, []);

  const tabs = [
    { label: 'Todos', value: '' },
    { label: 'Novos', value: 'new' },
    { label: 'Em Contato', value: 'contacted' },
    { label: 'Qualificados', value: 'qualified' },
    { label: 'Frios', value: 'cold' },
  ];

  const kpiCards = [
    { title: 'Total Ativos', value: stats.total || leads.length || '—', desc: 'leads cadastrados', icon: <Users size={16} />, color: 'indigo' },
    { title: 'Novos', value: stats.new || '—', desc: 'Não contatados', icon: <Inbox size={16} />, color: 'blue' },
    { title: 'Quentes (Score > 80)', value: stats.hot || '—', desc: 'Prontos para fechar', icon: <Flame size={16} />, color: 'rose' },
    { title: 'Taxa de Qualificação', value: stats.qualificationRate ? `${stats.qualificationRate}%` : '—', desc: 'leads qualificados', icon: <Target size={16} />, color: 'emerald' },
  ];

  return (
    <div className="space-y-6 animate-fade-in relative z-10 w-full pb-10">
      <NewLeadModal open={showNewModal} onClose={() => setShowNewModal(false)} onCreated={() => { queryClient.invalidateQueries({ queryKey: ['leads'] }); queryClient.invalidateQueries({ queryKey: ['leads-stats'] }); }} />

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Users size={20} className="text-white" />
            </div>
            Gestão de Leads
          </h1>
          <p className="text-dark-400 mt-1 text-sm">Acompanhe, qualifique e converta contatos em oportunidades.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-dark-800 p-1 rounded-lg border border-dark-700 flex items-center">
            <button onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-dark-700 text-white shadow-sm' : 'text-dark-400 hover:text-dark-200'}`} title="Visão Lista">
              <LayoutList size={16} />
            </button>
            <button onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-dark-700 text-white shadow-sm' : 'text-dark-400 hover:text-dark-200'}`} title="Visão Kanban">
              <LayoutGrid size={16} />
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 relative group">
            <button
              onClick={() => quickExportLeads(leads)}
              className="flex items-center gap-2 px-4 py-2 bg-dark-800 border border-dark-700 hover:bg-dark-700 text-dark-200 rounded-lg font-medium transition-all text-sm"
            >
              <FileDown size={16} className="text-dark-400 group-hover:text-indigo-400 transition-colors" />
              Exportar
            </button>

            {/* Menu dropdown para exportação avançada */}
            <button
              onClick={() => advancedExportLeads(leads)}
              className="px-2 py-2 bg-dark-800 border border-dark-700 hover:bg-dark-700 text-dark-400 hover:text-indigo-400 rounded-r-lg border-l-0 transition-all"
              title="Exportação avançada"
            >
              <ChevronDown size={14} />
            </button>

            {/* Tooltip */}
            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block">
              <div className="bg-dark-900 border border-dark-700 rounded-lg p-2 text-xs text-dark-300 whitespace-nowrap shadow-lg">
                Clique para exportação rápida (CSV)
                <br />
                Use o botão ▼ para opções avançadas
              </div>
            </div>
          </div>
          <button onClick={() => setShowNewModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-indigo-500/25 hover:-translate-y-0.5">
            <UserPlus size={18} />
            <span>Novo Lead</span>
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {kpiCards.map((kpi, idx) => (
          <div key={idx} className="glass-card p-5 border border-white/5 relative overflow-hidden group">
            <div className={`absolute -right-4 -top-4 w-20 h-20 rounded-full blur-2xl transition-all ${getKpiBlurClass(kpi.color)}`} />
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${getKpiIconClass(kpi.color)}`}>{kpi.icon}</div>
            <div className="text-dark-400 text-sm font-medium mb-1">{kpi.title}</div>
            <div className="text-2xl font-bold text-dark-100">{kpi.value}</div>
            <div className={`text-xs mt-1 font-medium ${getKpiTextClass(kpi.color)}`}>{kpi.desc}</div>
          </div>
        ))}
      </div>

      {/* FILTERS */}
      <div className="flex flex-col lg:flex-row justify-between gap-4 bg-dark-800/30 p-2 rounded-xl border border-white/5">
        <div className="flex overflow-x-auto hide-scrollbar gap-1">
          {tabs.map((tab, i) => (
            <button key={i} onClick={() => setActiveStatus(tab.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeStatus === tab.value ? 'bg-dark-700 text-white shadow-sm' : 'text-dark-400 hover:text-dark-200 hover:bg-dark-700/50'}`}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="relative w-full lg:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Nome, e-mail ou empresa..."
              className="w-full bg-dark-900/50 border border-dark-700/50 rounded-lg pl-9 pr-3 py-2 text-sm text-dark-100 placeholder:text-dark-600 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
          </div>
          <button onClick={() => {
            toast.success('Abrindo filtros avançados...');
            // Em uma implementação real, abriria um modal de filtros
          }} className="flex items-center gap-2 px-3 py-2 bg-dark-800 border border-dark-700 hover:bg-dark-700 hover:text-white rounded-lg text-dark-300 text-sm transition-all">
            <Filter size={16} /> <span>Filtros</span>
          </button>
        </div>
      </div>

      {/* LOADING */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* LIST VIEW */}
      {!isLoading && viewMode === 'list' && (
        <div className="glass-card border border-white/5 overflow-hidden">
          {/* Cabeçalho da tabela com botão de exportação */}
          <div className="flex justify-between items-center p-4 border-b border-dark-700/50 bg-dark-800/30">
            <div className="text-sm font-medium text-dark-300">
              {leads.length} lead(s) encontrado(s)
            </div>
            <button
              onClick={() => quickExportLeads(leads)}
              className="flex items-center gap-2 px-3 py-1.5 bg-dark-800 border border-dark-700 hover:bg-dark-700 text-dark-200 rounded-lg text-xs font-medium transition-all"
            >
              <FileDown size={12} />
              Exportar Lista
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-dark-800/40 text-xs uppercase tracking-widest text-dark-400 border-b border-dark-700/50">
                  <th className="px-5 py-4 font-semibold">Contato / Lead</th>
                  <th className="px-5 py-4 font-semibold">Contato</th>
                  <th className="px-5 py-4 font-semibold">Tags</th>
                  <th className="px-5 py-4 font-semibold">Score</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Responsável</th>
                  <th className="px-5 py-4 font-semibold text-right">Data</th>
                  <th className="px-5 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/30">
                {leads.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-16 text-dark-500">Nenhum lead encontrado</td></tr>
                )}
                {leads.map((lead) => {
                  const statusColor = STATUS_COLORS[lead.status] || 'slate';
                  return (
                    <tr key={lead.id} className="hover:bg-dark-800/40 transition-colors group cursor-pointer" onClick={() => {
                      toast.success(`Abrindo detalhes do lead: ${lead.name}`);
                      // Em uma implementação real, navegaria para a página de detalhes
                      window.location.href = `/leads/${lead.id}`;
                    }}>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-dark-100">{lead.name}</div>
                        <div className="text-xs text-dark-400 mt-0.5">{lead.company}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-0.5 text-xs text-dark-400">
                          {lead.email && <span className="flex items-center gap-1"><Mail size={11}/> {lead.email}</span>}
                          {lead.phone && <span className="flex items-center gap-1"><Phone size={11}/> {lead.phone}</span>}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(lead.tags || []).slice(0, 3).map((tag: any, i: number) => <TagBadge key={i} tag={tag} />)}
                        </div>
                      </td>
                      <td className="px-5 py-4"><ScoreBadge score={lead.score || 0} /></td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-md ${getStatusBadgeClass(statusColor)}`}>
                          {STATUS_LABELS[lead.status] || lead.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-dark-700 border border-dark-600 flex items-center justify-center text-[10px] font-bold text-dark-300">
                            {(lead.owner_name || '?').charAt(0)}
                          </div>
                          <span className="text-sm text-dark-200">{lead.owner_name || '—'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="text-sm text-dark-400">
                          {lead.created_at ? new Date(lead.created_at).toLocaleDateString('pt-BR') : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button onClick={(e) => {
                          e.stopPropagation();
                          // Navega para a página de detalhes do lead
                          window.location.href = `/leads/${lead.id}`;
                        }} className="text-dark-500 hover:text-white p-1 rounded hover:bg-dark-700 opacity-0 group-hover:opacity-100 transition-all">
                          <MoreVertical size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* KANBAN VIEW */}
      {!isLoading && viewMode === 'kanban' && (
        <div className="overflow-x-auto hide-scrollbar pb-4 -mx-2 px-2">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div className={`flex gap-4 min-w-max transition-all duration-300 ${isDragging ? 'opacity-80' : ''}`}>
              {LEAD_STATUSES.map(col => {
                const colLeads = leads.filter(l => l.status === col.id);
                return <KanbanColumn key={col.id} col={col} colLeads={colLeads} />;
              })}
            </div>

            {/* Drag Overlay para feedback visual */}
            {activeId && (
              <DragOverlay
                dropAnimation={{
                  duration: 300,
                  easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
                }}
              >
                <div className="glass-card p-4 border border-indigo-500 shadow-2xl shadow-indigo-500/30 rounded-lg w-[280px] transform rotate-3 scale-110">
                  <div className="font-semibold text-dark-100 text-sm mb-0.5">
                    {leads.find(l => l.id === activeId)?.name || 'Lead'}
                  </div>
                  <div className="text-xs text-dark-400 mb-2">
                    {leads.find(l => l.id === activeId)?.company || ''}
                  </div>
                  <div className="text-xs text-indigo-400 font-medium">
                    Arrastando...
                  </div>
                </div>
              </DragOverlay>
            )}
          </DndContext>
        </div>
      )}
    </div>
  );
}
