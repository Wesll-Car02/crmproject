import React, { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User, Phone, Mail, Building, MapPin, Calendar, Clock, CheckCircle2,
  MessageSquare, MailPlus, PhoneCall, Plus, FileText, StickyNote,
  Flame, Tag, Edit2, CheckSquare, Target, ArrowLeft, Users, Paperclip
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';

import AddTagModal from '../../components/leads/AddTagModal';
import EditContactModal from '../../components/leads/EditContactModal';
import AddTaskModal from '../../components/leads/AddTaskModal';
import ConvertLeadModal from '../../components/leads/ConvertLeadModal';
import LeadContactsTab from '../../components/leads/LeadContactsTab';
import LeadTasksTab from '../../components/leads/LeadTasksTab';
import LeadProposalsTab from '../../components/leads/LeadProposalsTab';
import LeadAttachmentsTab from '../../components/leads/LeadAttachmentsTab';

import {
  initiateCall,
  initiateWhatsApp,
  initiateEmail,
  getActivityIcon,
  formatDate
} from '../../utils/leadUtils';

type TabId = 'timeline' | 'notes' | 'contacts' | 'tasks' | 'proposals' | 'emails' | 'attachments';

interface TabConfig {
  id: TabId;
  icon: React.ReactNode;
  label: string;
}

const TABS: TabConfig[] = [
  { id: 'timeline',    icon: <Clock size={18} />,       label: 'Atividades' },
  { id: 'notes',       icon: <StickyNote size={18} />,  label: 'Notas' },
  { id: 'contacts',    icon: <Users size={18} />,        label: 'Contatos' },
  { id: 'tasks',       icon: <CheckSquare size={18} />,  label: 'Tarefas' },
  { id: 'proposals',   icon: <FileText size={18} />,     label: 'Propostas' },
  { id: 'emails',      icon: <Mail size={18} />,         label: 'E-mails' },
  { id: 'attachments', icon: <Paperclip size={18} />,    label: 'Anexos' },
];

// Groups for visual dividers: [[group1 ids], [group2 ids], [group3 ids]]
const TAB_GROUPS: TabId[][] = [
  ['timeline', 'notes'],
  ['contacts', 'tasks', 'proposals'],
  ['emails', 'attachments'],
];

function getTabGroup(tabId: TabId): number {
  return TAB_GROUPS.findIndex(g => g.includes(tabId));
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabFromUrl = (searchParams.get('tab') as TabId) || 'timeline';
  const [activeTab, setActiveTab] = useState<TabId>(TABS.some(t => t.id === tabFromUrl) ? tabFromUrl : 'timeline');
  const [quickActionText, setQuickActionText] = useState('');

  const [showTagModal, setShowTagModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);

  const { data: lead, isLoading, error } = useQuery({
    queryKey: ['lead', id],
    queryFn: () => api.get(`/leads/${id}`).then(r => r.data),
    enabled: !!id,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['lead-activities', id],
    queryFn: () => api.get(`/leads/${id}/activities`).then(r => r.data),
    enabled: !!id,
  });

  const notes = activities.filter((a: any) => a.type === 'note');
  const timelineActivities = activities.filter((a: any) => a.type !== 'note');
  const emailActivities = activities.filter((a: any) => a.type === 'email');

  const renderActivityIcon = (type: string) => {
    const iconName = getActivityIcon(type);
    switch (iconName) {
      case 'PhoneCall':    return <PhoneCall size={18} />;
      case 'Mail':         return <Mail size={18} />;
      case 'Calendar':     return <Calendar size={18} />;
      case 'FileText':     return <FileText size={18} />;
      case 'CheckSquare':  return <CheckSquare size={18} />;
      case 'MessageSquare':return <MessageSquare size={18} />;
      case 'Target':       return <Target size={18} />;
      case 'Flame':        return <Flame size={18} />;
      default:             return <MessageSquare size={18} />;
    }
  };

  const addActivityMutation = useMutation({
    mutationFn: (activityData: any) => api.post(`/leads/${id}/activities`, activityData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-activities', id] });
      setQuickActionText('');
      toast.success('Atividade registrada com sucesso!');
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Erro ao registrar atividade'),
  });

  const removeTagMutation = useMutation({
    mutationFn: (tagId: string) => api.delete(`/leads/${id}/tags/${tagId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', id] });
      toast.success('Tag removida com sucesso!');
    },
    onError: (error: any) => toast.error(error?.response?.data?.error || 'Erro ao remover tag'),
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
    if (score >= 50) return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      new: 'cyan', contacted: 'blue', qualified: 'emerald',
      converted: 'purple', cold: 'slate', lost: 'rose',
    };
    return map[status] || 'slate';
  };

  const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
      new: 'Novo', contacted: 'Em Contato', qualified: 'Qualificado',
      converted: 'Convertido', cold: 'Frio', lost: 'Perdido',
    };
    return map[status] || status;
  };

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const handleQuickActionSave = () => {
    if (!quickActionText.trim()) { toast.error('Digite uma atividade'); return; }
    addActivityMutation.mutate({ type: 'note', title: 'Nota rápida', description: quickActionText.trim(), notes: quickActionText.trim() });
  };

  const handleAddCallActivity = () => {
    if (!lead.phone) { toast.error('Lead não tem telefone cadastrado'); return; }
    addActivityMutation.mutate({ type: 'call', title: 'Ligação realizada', description: `Ligação para ${lead.phone}`, notes: quickActionText || 'Ligação realizada com o lead' });
    initiateCall(lead.phone);
  };

  const handleRemoveTag = (tagId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Remover esta tag?')) removeTagMutation.mutate(tagId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-4">
          <User size={32} className="text-rose-400" />
        </div>
        <h3 className="text-lg font-semibold text-dark-100 mb-2">Lead não encontrado</h3>
        <p className="text-dark-400 text-sm max-w-sm">O lead que você está tentando acessar não existe ou não pôde ser carregado.</p>
        <button onClick={() => navigate('/leads')} className="mt-4 px-4 py-2 bg-dark-800 hover:bg-dark-700 border border-dark-700 text-dark-300 hover:text-white rounded-lg transition-colors text-sm flex items-center gap-2">
          <ArrowLeft size={16} /> Voltar para Leads
        </button>
      </div>
    );
  }

  const showQuickBar = activeTab === 'timeline' || activeTab === 'notes' || activeTab === 'emails';

  return (
    <div className="space-y-6 animate-fade-in relative z-10 w-full pb-10">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/leads')} className="w-10 h-10 flex items-center justify-center rounded-xl bg-dark-800 hover:bg-dark-700 border border-dark-700/50 text-dark-300 hover:text-white transition-all">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-dark-100">{lead.name || 'Lead sem nome'}</h1>
            <p className="text-dark-400 mt-0.5 text-sm">
              {lead.position ? `${lead.position} em ` : ''}
              <span className="text-dark-200 font-medium">{lead.company || 'Empresa não informada'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => lead.phone && initiateCall(lead.phone)} disabled={!lead.phone} className="flex items-center justify-center w-10 h-10 bg-dark-800 hover:bg-dark-700 border border-dark-700 text-dark-300 hover:text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed" title="Ligar">
            <PhoneCall size={16} />
          </button>
          <button onClick={() => lead.phone && initiateWhatsApp(lead.phone)} disabled={!lead.phone} className="flex items-center justify-center w-10 h-10 bg-dark-800 hover:bg-dark-700 border border-dark-700 text-dark-300 hover:text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed" title="WhatsApp">
            <MessageSquare size={16} />
          </button>
          <button onClick={() => lead.email && initiateEmail(lead.email, `Contato - ${lead.company || lead.name}`, '')} disabled={!lead.email} className="flex items-center justify-center w-10 h-10 bg-dark-800 hover:bg-dark-700 border border-dark-700 text-dark-300 hover:text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed" title="Email">
            <MailPlus size={16} />
          </button>
          <div className="h-6 w-px bg-dark-700 mx-1" />
          <button onClick={() => setShowConvertModal(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-emerald-500/25">
            <CheckCircle2 size={16} />
            <span>Converter</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* LEFT — PROFILE CARD */}
        <div className="xl:col-span-1 space-y-6">
          <div className="glass-card p-6 border border-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 bg-indigo-500" />

            <div className="flex justify-between items-start mb-6">
              <h3 className="text-lg font-semibold text-dark-100">Sobre o Lead</h3>
              <button onClick={() => setShowEditModal(true)} className="text-dark-400 hover:text-indigo-400 transition-colors cursor-pointer relative z-10" title="Editar informações do lead">
                <Edit2 size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail size={16} className="text-dark-400 mt-0.5" />
                <div><div className="text-xs text-dark-500">Email</div><div className="text-sm font-medium text-dark-100">{lead.email || '—'}</div></div>
              </div>
              <div className="flex items-start gap-3">
                <Phone size={16} className="text-dark-400 mt-0.5" />
                <div><div className="text-xs text-dark-500">Telefone</div><div className="text-sm font-medium text-dark-100">{lead.phone || '—'}</div></div>
              </div>
              <div className="flex items-start gap-3">
                <Building size={16} className="text-dark-400 mt-0.5" />
                <div><div className="text-xs text-dark-500">Empresa</div><div className="text-sm font-medium text-dark-100">{lead.company || '—'} {lead.position ? `(${lead.position})` : ''}</div></div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin size={16} className="text-dark-400 mt-0.5" />
                <div><div className="text-xs text-dark-500">Localização</div><div className="text-sm font-medium text-dark-100">{lead.location || lead.city || '—'}</div></div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-dark-700/50">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-dark-500 mb-1">Score</div>
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${getScoreColor(lead.score || 0)}`}>
                    <Flame size={14} /> <span className="font-bold">{lead.score || 0}</span>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-dark-500 mb-1">Status</div>
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border bg-${getStatusColor(lead.status)}-500/10 border-${getStatusColor(lead.status)}-500/20 text-${getStatusColor(lead.status)}-400`}>
                    <span className="font-semibold text-sm">{getStatusLabel(lead.status)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Oportunidade convertida */}
            {(() => {
              if (!lead.converted_at) return null;
              let opps = lead.converted_opportunities;
              if (typeof opps === 'string') { try { opps = JSON.parse(opps); } catch (_) { opps = []; } }
              if (!Array.isArray(opps) || opps.length === 0) return null;
              return (
                <div className="mt-6 pt-6 border-t border-dark-700/50">
                  <div className="text-xs text-dark-500 mb-2 flex items-center gap-1.5"><Target size={12} /> Oportunidade Convertida</div>
                  <div className="space-y-2">
                    {opps.map((opp: any) => (
                      <div key={opp.id} className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-dark-100 text-sm">{opp.title}</div>
                            <div className="text-xs text-dark-400 mt-1">
                              <span className="text-emerald-400 font-medium">R$ {Number(opp.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            </div>
                          </div>
                          <button onClick={() => { if (!opp.id) { toast.error('ID da oportunidade não encontrado'); return; } navigate(`/opportunities/${opp.id}`); }} className="text-xs px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 hover:text-emerald-300 rounded-lg transition-colors">
                            Ver Oportunidade
                          </button>
                        </div>
                        <div className="text-xs text-dark-500 mt-2">Convertido em {new Date(lead.converted_at).toLocaleDateString('pt-BR')}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Tags */}
            <div className="mt-6">
              <div className="text-xs text-dark-500 mb-2 flex items-center gap-1.5"><Tag size={12} /> Tags</div>
              <div className="flex flex-wrap gap-1.5">
                {(lead.tags || []).map((tag: any, i: number) => {
                  const tagName  = typeof tag === 'object' ? tag.name  : tag;
                  const tagColor = typeof tag === 'object' ? tag.color : '#6b7280';
                  const tagId    = typeof tag === 'object' ? tag.id    : i.toString();
                  return (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-dark-800 border flex items-center gap-1 group relative" style={{ borderColor: `${tagColor}44`, color: tagColor, backgroundColor: `${tagColor}15` }}>
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tagColor }} />
                      {tagName}
                      <button onClick={(e) => handleRemoveTag(tagId, e)} className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-300 transition-opacity ml-1">×</button>
                    </span>
                  );
                })}
                <button onClick={() => setShowTagModal(true)} className="text-xs px-2.5 py-1 rounded-full bg-dark-800/50 border border-dashed border-dark-600 text-dark-400 hover:text-white transition-colors">
                  <Plus size={12} />
                </button>
              </div>
            </div>

            {/* Nota */}
            <div className="mt-6 pt-6 border-t border-dark-700/50 text-sm p-3 bg-dark-800/30 rounded-lg text-dark-300 italic border-l-2 border-l-indigo-500">
              "{lead.notes || lead.about || 'Sem informações adicionais.'}"
            </div>
          </div>
        </div>

        {/* RIGHT — TABS AREA */}
        <div className="xl:col-span-2 space-y-4">

          {/* Quick action bar (apenas para atividades/notas/emails) */}
          {showQuickBar && (
            <div className="p-1 rounded-xl bg-dark-800/50 border border-white/5 flex">
              <input
                type="text"
                placeholder="Adicionar nota, registrar ligação ou enviar email..."
                className="flex-1 bg-transparent border-0 px-4 py-3 focus:outline-none text-dark-100 placeholder:text-dark-500"
                value={quickActionText}
                onChange={(e) => setQuickActionText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleQuickActionSave()}
              />
              <div className="flex items-center pr-2 gap-1 text-dark-400">
                <button onClick={() => lead.email && initiateEmail(lead.email, `Contato - ${lead.company || lead.name}`, quickActionText)} disabled={!lead.email} className="p-2 hover:bg-dark-700 rounded-lg hover:text-indigo-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Enviar email">
                  <MailPlus size={18} />
                </button>
                <button onClick={handleAddCallActivity} disabled={!lead.phone} className="p-2 hover:bg-dark-700 rounded-lg hover:text-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Registrar ligação">
                  <PhoneCall size={18} />
                </button>
                <button onClick={handleQuickActionSave} disabled={addActivityMutation.isPending} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg transition-colors font-medium ml-2 disabled:opacity-50">
                  {addActivityMutation.isPending ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          )}

          {/* ICON TAB BAR — estilo Kommo */}
          <div className="glass-card border border-white/5 overflow-hidden flex flex-col" style={{ minHeight: 520 }}>
            <div className="flex items-center border-b border-dark-700/50 bg-dark-800/30 px-3 py-1 gap-0.5 overflow-x-auto">
              {TABS.map((tab, index) => {
                const isActive = activeTab === tab.id;
                const currentGroup = getTabGroup(tab.id);
                const prevGroup = index > 0 ? getTabGroup(TABS[index - 1].id) : currentGroup;
                const showDivider = index > 0 && currentGroup !== prevGroup;

                return (
                  <React.Fragment key={tab.id}>
                    {showDivider && (
                      <div className="w-px h-6 bg-dark-700 mx-1.5 flex-shrink-0" />
                    )}
                    <button
                      onClick={() => handleTabChange(tab.id)}
                      title={tab.label}
                      className={`relative flex flex-col items-center justify-center px-3 py-2.5 rounded-lg transition-all flex-shrink-0 group ${
                        isActive
                          ? 'text-indigo-400 bg-indigo-500/10'
                          : 'text-dark-500 hover:text-dark-200 hover:bg-dark-700/50'
                      }`}
                    >
                      {tab.icon}
                      <span className={`text-[10px] mt-1 font-medium leading-none ${isActive ? 'text-indigo-400' : 'text-dark-600 group-hover:text-dark-400'}`}>
                        {tab.label}
                      </span>
                      {isActive && (
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-indigo-500 rounded-full" />
                      )}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>

            {/* TAB CONTENT */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">

              {/* ATIVIDADES */}
              {activeTab === 'timeline' && (
                <div className="space-y-6 relative">
                  <div className="absolute top-0 bottom-0 left-4 w-px bg-dark-700/50 z-0" />
                  <div className="relative z-10 flex gap-5">
                    <div className="w-10 h-10 rounded-full bg-dark-700 border border-dark-600 flex items-center justify-center text-dark-300 flex-shrink-0">
                      <Plus size={18} />
                    </div>
                    <div className="flex-1 bg-dark-800/20 border border-dark-700/30 rounded-xl p-4">
                      <div className="font-medium text-dark-100 mb-1">Agendar nova tarefa</div>
                      <p className="text-sm text-dark-400 mb-3">Agende uma ligação, reunião ou tarefa para este lead.</p>
                      <button onClick={() => setShowTaskModal(true)} className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg text-sm font-medium transition-colors">
                        Agendar Tarefa
                      </button>
                    </div>
                  </div>
                  {timelineActivities.length > 0 ? (
                    timelineActivities.map((activity: any, i: number) => (
                      <div key={i} className="relative z-10 flex gap-5">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
                          {renderActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 bg-dark-800/40 border border-dark-700/50 rounded-xl p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-medium text-dark-100">{activity.title}</div>
                            <div className="text-xs text-dark-500">{activity.created_at ? formatDate(activity.created_at) : '—'}</div>
                          </div>
                          <p className="text-sm text-dark-300">{activity.description}</p>
                          {activity.notes && (
                            <p className="text-sm text-dark-300 mt-2 p-3 bg-dark-900 rounded-lg border border-dark-700 italic">"{activity.notes}"</p>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="relative z-10 flex gap-5">
                      <div className="w-10 h-10 rounded-full bg-dark-700 border border-dark-600 flex items-center justify-center text-dark-300 flex-shrink-0">
                        <Plus size={18} />
                      </div>
                      <div className="flex-1 bg-dark-800/20 border border-dark-700/30 rounded-xl p-4">
                        <div className="font-medium text-dark-100 mb-1">Lead Criado</div>
                        <div className="text-xs text-dark-500">{lead.created_at ? formatDate(lead.created_at) : '—'}</div>
                        <p className="text-sm text-dark-400 mt-1">Origem: {lead.source || 'Manual'}.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* NOTAS */}
              {activeTab === 'notes' && (
                notes.length > 0 ? (
                  <div className="space-y-4">
                    {notes.map((note: any, i: number) => (
                      <div key={i} className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
                          <StickyNote size={18} />
                        </div>
                        <div className="flex-1 bg-dark-800/40 border border-dark-700/50 rounded-xl p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-medium text-dark-100">{note.title || 'Nota'}</div>
                            <div className="text-xs text-dark-500">{note.created_at ? formatDate(note.created_at) : '—'}</div>
                          </div>
                          <p className="text-sm text-dark-300">{note.description}</p>
                          {note.notes && <p className="text-sm text-dark-300 mt-2 p-3 bg-dark-900 rounded-lg border border-dark-700 italic">"{note.notes}"</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-dark-500">
                    <StickyNote size={32} className="mx-auto mb-2 opacity-50" />
                    <p>Nenhuma nota registrada ainda.</p>
                    <p className="text-sm mt-1">Use o campo acima para adicionar uma nota rápida.</p>
                  </div>
                )
              )}

              {/* CONTATOS */}
              {activeTab === 'contacts' && <LeadContactsTab leadId={id!} />}

              {/* TAREFAS */}
              {activeTab === 'tasks' && <LeadTasksTab leadId={id!} leadName={lead.name} />}

              {/* PROPOSTAS */}
              {activeTab === 'proposals' && <LeadProposalsTab lead={lead} />}

              {/* E-MAILS */}
              {activeTab === 'emails' && (
                emailActivities.length > 0 ? (
                  <div className="space-y-4">
                    {emailActivities.map((activity: any, i: number) => (
                      <div key={i} className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 flex-shrink-0">
                          <Mail size={18} />
                        </div>
                        <div className="flex-1 bg-dark-800/40 border border-dark-700/50 rounded-xl p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="font-medium text-dark-100">{activity.title}</div>
                            <div className="text-xs text-dark-500">{activity.created_at ? formatDate(activity.created_at) : '—'}</div>
                          </div>
                          <p className="text-sm text-dark-300">{activity.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-dark-500">
                    <Mail size={32} className="mx-auto mb-2 opacity-50" />
                    <p>Nenhum e-mail registrado ainda.</p>
                    <p className="text-sm mt-1">Use o campo acima para registrar um e-mail enviado.</p>
                  </div>
                )
              )}

              {/* ANEXOS */}
              {activeTab === 'attachments' && <LeadAttachmentsTab leadId={id!} />}

            </div>
          </div>
        </div>
      </div>

      {/* MODAIS */}
      <AddTagModal leadId={id!} currentTags={lead.tags || []} isOpen={showTagModal} onClose={() => setShowTagModal(false)} onTagAdded={() => queryClient.invalidateQueries({ queryKey: ['lead', id] })} />

      {showEditModal && (
        <EditContactModal
          leadId={id!}
          currentData={{ email: lead.email, phone: lead.phone, company: lead.company, position: lead.position, location: lead.location || lead.city, notes: lead.notes || lead.about }}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
        />
      )}

      <AddTaskModal leadId={id!} leadName={lead.name} isOpen={showTaskModal} onClose={() => setShowTaskModal(false)} />

      <ConvertLeadModal leadId={id!} leadName={lead.name} leadCompany={lead.company} isOpen={showConvertModal} onClose={() => setShowConvertModal(false)} onSuccess={() => { toast.success('Lead convertido com sucesso!'); navigate('/opportunities'); }} />
    </div>
  );
}
