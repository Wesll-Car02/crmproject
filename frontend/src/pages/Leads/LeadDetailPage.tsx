import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User, Phone, Mail, Building, MapPin, Calendar, Clock, CheckCircle2,
  MessageSquare, MailPlus, PhoneCall, Plus, FileText, MoreVertical,
  Flame, Tag, Edit2, CheckSquare, Target, ArrowLeft, Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';

// Componentes
import AddTagModal from '../../components/leads/AddTagModal';
import EditContactModal from '../../components/leads/EditContactModal';
import AddTaskModal from '../../components/leads/AddTaskModal';
import ConvertLeadModal from '../../components/leads/ConvertLeadModal';
import LeadContactsTab from '../../components/leads/LeadContactsTab';

// Utilitários
import {
  initiateCall,
  initiateWhatsApp,
  initiateEmail,
  getActivityIcon,
  getActivityColor,
  formatDate,
  Tag as TagType
} from '../../utils/leadUtils';

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'timeline' | 'notes' | 'contacts'>('timeline');
  const [quickActionText, setQuickActionText] = useState('');

  // Estados para modais
  const [showTagModal, setShowTagModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);

  // Buscar dados do lead
  const { data: lead, isLoading, error } = useQuery({
    queryKey: ['lead', id],
    queryFn: () => api.get(`/leads/${id}`).then(r => r.data),
    enabled: !!id,
  });

  // Buscar atividades
  const { data: activities = [], refetch: refetchActivities } = useQuery({
    queryKey: ['lead-activities', id],
    queryFn: () => api.get(`/leads/${id}/activities`).then(r => r.data),
    enabled: !!id,
  });

  // Buscar notas específicas
  const notes = activities.filter((a: any) => a.type === 'note');
  const timelineActivities = activities.filter((a: any) => a.type !== 'note');

  // Função para renderizar ícone de atividade
  const renderActivityIcon = (type: string) => {
    const iconName = getActivityIcon(type);
    switch (iconName) {
      case 'PhoneCall': return <PhoneCall size={18} />;
      case 'Mail': return <Mail size={18} />;
      case 'Calendar': return <Calendar size={18} />;
      case 'FileText': return <FileText size={18} />;
      case 'CheckSquare': return <CheckSquare size={18} />;
      case 'MessageSquare': return <MessageSquare size={18} />;
      case 'Target': return <Target size={18} />;
      case 'Flame': return <Flame size={18} />;
      default: return <MessageSquare size={18} />;
    }
  };

  // Mutação para adicionar atividade rápida
  const addActivityMutation = useMutation({
    mutationFn: (activityData: any) =>
      api.post(`/leads/${id}/activities`, activityData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-activities', id] });
      setQuickActionText('');
      toast.success('Atividade registrada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Erro ao registrar atividade');
    }
  });

  // Mutação para remover tag
  const removeTagMutation = useMutation({
    mutationFn: (tagId: string) =>
      api.delete(`/leads/${id}/tags/${tagId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', id] });
      toast.success('Tag removida com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Erro ao remover tag');
    }
  });

  // Funções auxiliares
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-rose-500 bg-rose-500/10 border-rose-500/20";
    if (score >= 50) return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
  };

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      new: 'cyan',
      contacted: 'blue',
      qualified: 'emerald',
      converted: 'purple',
      cold: 'slate',
      lost: 'rose'
    };
    return statusColors[status] || 'slate';
  };

  const getStatusLabel = (status: string) => {
    const statusLabels: Record<string, string> = {
      new: 'Novo',
      contacted: 'Em Contato',
      qualified: 'Qualificado',
      converted: 'Convertido',
      cold: 'Frio',
      lost: 'Perdido'
    };
    return statusLabels[status] || status;
  };

  // Handlers
  const handleQuickActionSave = () => {
    if (!quickActionText.trim()) {
      toast.error('Digite uma atividade');
      return;
    }

    addActivityMutation.mutate({
      type: 'note',
      title: 'Nota rápida',
      description: quickActionText.trim(),
      notes: quickActionText.trim()
    });
  };

  const handleAddEmailActivity = () => {
    if (!lead.email) {
      toast.error('Lead não tem e-mail cadastrado');
      return;
    }
    initiateEmail(lead.email, `Contato - ${lead.company || lead.name}`, quickActionText);
  };

  const handleAddCallActivity = () => {
    if (!lead.phone) {
      toast.error('Lead não tem telefone cadastrado');
      return;
    }

    addActivityMutation.mutate({
      type: 'call',
      title: 'Ligação realizada',
      description: `Ligação para ${lead.phone}`,
      notes: quickActionText || 'Ligação realizada com o lead'
    });

    initiateCall(lead.phone);
  };

  const handleRemoveTag = (tagId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Remover esta tag?')) {
      removeTagMutation.mutate(tagId);
    }
  };

  const handleTagAdded = () => {
    queryClient.invalidateQueries({ queryKey: ['lead', id] });
  };

  const handleConvertSuccess = () => {
    // Navegar para a página de oportunidades ou atualizar
    toast.success('Lead convertido com sucesso!');
    navigate('/opportunities');
  };

  // Estados de loading/error
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
        <p className="text-dark-400 text-sm max-w-sm">
          O lead que você está tentando acessar não existe ou não pôde ser carregado.
        </p>
        <button
          onClick={() => navigate('/leads')}
          className="mt-4 px-4 py-2 bg-dark-800 hover:bg-dark-700 border border-dark-700 text-dark-300 hover:text-white rounded-lg transition-colors text-sm flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Voltar para Leads
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in relative z-10 w-full pb-10">

      {/* HEADER: Volta e Ações */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/leads')}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-dark-800 hover:bg-dark-700 border border-dark-700/50 text-dark-300 hover:text-white transition-all"
          >
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
           <button
             onClick={() => lead.phone && initiateCall(lead.phone)}
             disabled={!lead.phone}
             className="flex items-center justify-center w-10 h-10 bg-dark-800 hover:bg-dark-700 border border-dark-700 text-dark-300 hover:text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
             title="Ligar"
           >
             <PhoneCall size={16} />
           </button>
           <button
             onClick={() => lead.phone && initiateWhatsApp(lead.phone)}
             disabled={!lead.phone}
             className="flex items-center justify-center w-10 h-10 bg-dark-800 hover:bg-dark-700 border border-dark-700 text-dark-300 hover:text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
             title="WhatsApp"
           >
             <MessageSquare size={16} />
           </button>
           <button
             onClick={() => lead.email && initiateEmail(lead.email, `Contato - ${lead.company || lead.name}`, '')}
             disabled={!lead.email}
             className="flex items-center justify-center w-10 h-10 bg-dark-800 hover:bg-dark-700 border border-dark-700 text-dark-300 hover:text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
             title="Email"
           >
             <MailPlus size={16} />
           </button>
           <div className="h-6 w-px bg-dark-700 mx-1"></div>
           <button
             onClick={() => setShowConvertModal(true)}
             className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-emerald-500/25"
           >
             <CheckCircle2 size={16} />
             <span>Converter</span>
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* LEFT PROFILE CARD */}
        <div className="xl:col-span-1 space-y-6">
          <div className="glass-card p-6 border border-white/5 relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 bg-indigo-500`} />
            
            <div className="flex justify-between items-start mb-6">
               <h3 className="text-lg font-semibold text-dark-100">Sobre o Lead</h3>
               <button
                 onClick={() => setShowEditModal(true)}
                 className="text-dark-400 hover:text-indigo-400 transition-colors cursor-pointer relative z-10"
                 title="Editar informações do lead"
               >
                 <Edit2 size={16}/>
               </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail size={16} className="text-dark-400 mt-0.5 mt-0.5" />
                <div>
                  <div className="text-xs text-dark-500">Email</div>
                  <div className="text-sm font-medium text-dark-100">{lead.email || '—'}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone size={16} className="text-dark-400 mt-0.5" />
                <div>
                  <div className="text-xs text-dark-500">Telefone</div>
                  <div className="text-sm font-medium text-dark-100">{lead.phone || '—'}</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Building size={16} className="text-dark-400 mt-0.5" />
                <div>
                  <div className="text-xs text-dark-500">Empresa</div>
                  <div className="text-sm font-medium text-dark-100">
                    {lead.company || '—'} {lead.position ? `(${lead.position})` : ''}
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin size={16} className="text-dark-400 mt-0.5" />
                <div>
                  <div className="text-xs text-dark-500">Localização</div>
                  <div className="text-sm font-medium text-dark-100">{lead.location || lead.city || '—'}</div>
                </div>
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
                    <span className="w-1.5 h-1.5 rounded-full bg-${getStatusColor(lead.status)}-500 animate-pulse"></span>
                    <span className="font-semibold text-sm">{getStatusLabel(lead.status)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Converted Opportunity Section */}
            {(() => {
              if (!lead.converted_at) return false;

              let opportunities = lead.converted_opportunities;
              console.log('converted_opportunities raw:', opportunities, 'type:', typeof opportunities);

              // Handle both array and string JSON
              if (typeof opportunities === 'string') {
                try {
                  opportunities = JSON.parse(opportunities);
                } catch (e) {
                  console.error('Error parsing converted_opportunities:', e);
                  opportunities = [];
                }
              }

              if (!Array.isArray(opportunities) || opportunities.length === 0) {
                return false;
              }

              console.log('converted_opportunities parsed:', opportunities);

              return (
                <div className="mt-6 pt-6 border-t border-dark-700/50">
                  <div className="text-xs text-dark-500 mb-2 flex items-center gap-1.5">
                    <Target size={12} /> Oportunidade Convertida
                  </div>
                  <div className="space-y-2">
                    {opportunities.map((opp: any) => (
                      <div key={opp.id} className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium text-dark-100 text-sm">{opp.title}</div>
                            <div className="text-xs text-dark-400 mt-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs"
                                style={{ backgroundColor: `${opp.stage_color}22`, color: opp.stage_color, borderColor: `${opp.stage_color}44` }}>
                                {opp.stage_name}
                              </span>
                              <span className="mx-2">•</span>
                              <span className="text-emerald-400 font-medium">
                                R$ {Number(opp.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              console.log('Clicou em Ver Oportunidade (button), opp:', opp, 'opp.id:', opp.id, 'URL:', `/opportunities/${opp.id}`);
                              if (!opp.id) {
                                console.error('opp.id is undefined or null!');
                                toast.error('ID da oportunidade não encontrado');
                                return;
                              }
                              console.log('Navigating to:', `/opportunities/${opp.id}`, 'current pathname:', window.location.pathname);
                              navigate(`/opportunities/${opp.id}`, { replace: false });
                              console.log('After navigate call');
                            }}
                            className="text-xs px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 hover:text-emerald-300 rounded-lg transition-colors inline-block"
                          >
                            Ver Oportunidade
                          </button>
                        </div>
                        <div className="text-xs text-dark-500 mt-2">
                          Convertido em {new Date(lead.converted_at).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="mt-6">
              <div className="text-xs text-dark-500 mb-2 flex items-center gap-1.5"><Tag size={12}/> Tags</div>
              <div className="flex flex-wrap gap-1.5">
                {(lead.tags || []).map((tag: any, i: number) => {
                  const tagName = typeof tag === 'object' ? tag.name : tag;
                  const tagColor = typeof tag === 'object' ? tag.color : '#6b7280';
                  const tagId = typeof tag === 'object' ? tag.id : i.toString();

                  return (
                    <span
                      key={i}
                      className="text-xs px-2.5 py-1 rounded-full bg-dark-800 border flex items-center gap-1 group relative"
                      style={{
                        borderColor: `${tagColor}44`,
                        color: tagColor,
                        backgroundColor: `${tagColor}15`
                      }}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: tagColor }}
                      />
                      {tagName}
                      <button
                        onClick={(e) => handleRemoveTag(tagId, e)}
                        className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-300 transition-opacity ml-1"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
                <button
                  onClick={() => setShowTagModal(true)}
                  className="text-xs px-2.5 py-1 rounded-full bg-dark-800/50 border border-dashed border-dark-600 text-dark-400 hover:text-white transition-colors"
                >
                  <Plus size={12}/>
                </button>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-dark-700/50 text-sm p-3 bg-dark-800/30 rounded-lg text-dark-300 italic border-l-2 border-l-indigo-500">
              "{lead.notes || lead.about || 'Sem informações adicionais.'}"
            </div>

          </div>
        </div>

        {/* RIGHT TIMELINE CARD */}
        <div className="xl:col-span-2 space-y-6">
          
          {/* Quick Action Input */}
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
              <button
                onClick={handleAddEmailActivity}
                disabled={!lead.email}
                className="p-2 hover:bg-dark-700 rounded-lg hover:text-indigo-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Enviar email"
              >
                <MailPlus size={18}/>
              </button>
              <button
                onClick={handleAddCallActivity}
                disabled={!lead.phone}
                className="p-2 hover:bg-dark-700 rounded-lg hover:text-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Registrar ligação"
              >
                <PhoneCall size={18}/>
              </button>
              <button
                onClick={handleQuickActionSave}
                disabled={addActivityMutation.isPending}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg transition-colors font-medium ml-2 disabled:opacity-50"
              >
                {addActivityMutation.isPending ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>

          <div className="glass-card border border-white/5 overflow-hidden flex flex-col h-[600px]">
            {/* TABS */}
            <div className="flex border-b border-dark-700/50 bg-dark-800/30 px-2 py-2">
              <button 
                onClick={() => setActiveTab('timeline')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'timeline' ? 'bg-indigo-500/10 text-indigo-400' : 'text-dark-400 hover:text-dark-200'}`}
              >
                <Clock size={16}/> Atividades
              </button>
              <button 
                onClick={() => setActiveTab('notes')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'notes' ? 'bg-indigo-500/10 text-indigo-400' : 'text-dark-400 hover:text-dark-200'}`}
              >
                <FileText size={16}/> Notas
              </button>
              <button 
                onClick={() => setActiveTab('contacts')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'contacts' ? 'bg-indigo-500/10 text-indigo-400' : 'text-dark-400 hover:text-dark-200'}`}
              >
                <Users size={16}/> Contatos Relacionados
              </button>
            </div>

            {/* TIMELINE FEED */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar relative">
              {/* Vertical line connecting timeline */}
              <div className="absolute top-10 bottom-6 left-11 w-px bg-dark-700/50 z-0"></div>

              {/* Botão para adicionar tarefa */}
              <div className="relative z-10 flex gap-5">
                <div className="w-10 h-10 rounded-full bg-dark-700 border border-dark-600 flex items-center justify-center text-dark-300 mt-1 flex-shrink-0">
                  <Plus size={18} />
                </div>
                <div className="flex-1 bg-dark-800/20 border border-dark-700/30 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium text-dark-100">Agendar nova tarefa</div>
                  </div>
                  <p className="text-sm text-dark-400 mb-3">Agende uma ligação, reunião ou tarefa para este lead.</p>
                  <button
                    onClick={() => setShowTaskModal(true)}
                    className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Agendar Tarefa
                  </button>
                </div>
              </div>

              {/* Atividades reais da API */}
              {activeTab === 'timeline' ? (
                timelineActivities && timelineActivities.length > 0 ? (
                  timelineActivities.map((activity: any, i: number) => (
                    <div key={i} className="relative z-10 flex gap-5">
                      <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mt-1 flex-shrink-0">
                        {renderActivityIcon(activity.type)}
                      </div>
                      <div className="flex-1 bg-dark-800/40 border border-dark-700/50 rounded-xl p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium text-dark-100">{activity.title}</div>
                          <div className="text-xs text-dark-500">
                            {activity.created_at ? formatDate(activity.created_at) : '—'}
                          </div>
                        </div>
                        <p className="text-sm text-dark-300">{activity.description}</p>
                        {activity.notes && (
                          <p className="text-sm text-dark-300 mt-2 p-3 bg-dark-900 rounded-lg border border-dark-700 italic">
                            "{activity.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  // Item de criação do lead (fallback)
                  <div className="relative z-10 flex gap-5">
                    <div className="w-10 h-10 rounded-full bg-dark-700 border border-dark-600 flex items-center justify-center text-dark-300 mt-1 flex-shrink-0">
                      <Plus size={18} />
                    </div>
                    <div className="flex-1 bg-dark-800/20 border border-dark-700/30 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-dark-100">Lead Criado</div>
                        <div className="text-xs text-dark-500">
                          {lead.created_at ? formatDate(lead.created_at) : '—'}
                        </div>
                      </div>
                      <p className="text-sm text-dark-400">Origem: {lead.source || 'Manual'}.</p>
                    </div>
                  </div>
                )
              ) : activeTab === 'notes' ? (
                // Notas específicas
                notes && notes.length > 0 ? (
                  notes.map((note: any, i: number) => (
                    <div key={i} className="relative z-10 flex gap-5">
                      <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mt-1 flex-shrink-0">
                        <FileText size={18} />
                      </div>
                      <div className="flex-1 bg-dark-800/40 border border-dark-700/50 rounded-xl p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium text-dark-100">{note.title || 'Nota'}</div>
                          <div className="text-xs text-dark-500">
                            {note.created_at ? formatDate(note.created_at) : '—'}
                          </div>
                        </div>
                        <p className="text-sm text-dark-300">{note.description}</p>
                        {note.notes && (
                          <p className="text-sm text-dark-300 mt-2 p-3 bg-dark-900 rounded-lg border border-dark-700 italic">
                            "{note.notes}"
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-dark-500">
                    <FileText size={32} className="mx-auto mb-2 opacity-50" />
                    <p>Nenhuma nota registrada ainda.</p>
                    <p className="text-sm mt-1">Use o campo acima para adicionar uma nota rápida.</p>
                  </div>
                )
              ) : activeTab === 'contacts' ? (
                <LeadContactsTab leadId={id!} />
              ) : null}

            </div>
          </div>
        </div>

      </div>

      {/* Modal Components */}
      <AddTagModal
        leadId={id!}
        currentTags={lead.tags || []}
        isOpen={showTagModal}
        onClose={() => setShowTagModal(false)}
        onTagAdded={handleTagAdded}
      />

      {showEditModal && (
        <EditContactModal
          leadId={id!}
          currentData={{
            email: lead.email,
            phone: lead.phone,
            company: lead.company,
            position: lead.position,
            location: lead.location || lead.city,
            notes: lead.notes || lead.about
          }}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
        />
      )}

      <AddTaskModal
        leadId={id!}
        leadName={lead.name}
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
      />

      <ConvertLeadModal
        leadId={id!}
        leadName={lead.name}
        leadCompany={lead.company}
        isOpen={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        onSuccess={handleConvertSuccess}
      />
    </div>
  );
}
