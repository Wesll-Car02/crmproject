import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Target, DollarSign, TrendingUp, Calendar, Percent, User, Building,
  FileText, MoreVertical, Edit2, ArrowLeft, Tag, CheckCircle, XCircle,
  Clock, MessageSquare, Phone, Mail, MapPin
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';

// Componentes
import EditOpportunityModal from '../../components/opportunities/EditOpportunityModal';

export default function OpportunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'details' | 'activities' | 'notes'>('details');
  const [showEditModal, setShowEditModal] = useState(false);

  // Buscar dados da oportunidade
  const { data: opportunity, isLoading, error } = useQuery({
    queryKey: ['opportunity', id],
    queryFn: () => api.get(`/opportunities/${id}`).then(r => r.data),
    enabled: !!id,
  });

  // Buscar atividades da oportunidade
  const { data: activities } = useQuery({
    queryKey: ['opportunity-activities', id],
    queryFn: () => api.get(`/opportunities/${id}/activities`).then(r => r.data),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-dark-400">Carregando oportunidade...</div>
      </div>
    );
  }

  if (error || !opportunity) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-4">
          <Target size={32} className="text-rose-400" />
        </div>
        <h3 className="text-lg font-semibold text-dark-100 mb-2">Oportunidade não encontrada</h3>
        <p className="text-dark-400 text-sm max-w-sm">
          A oportunidade que você está tentando acessar não existe ou não pôde ser carregada.
        </p>
        <button
          onClick={() => navigate('/opportunities')}
          className="mt-4 px-4 py-2 bg-dark-800 hover:bg-dark-700 border border-dark-700 text-dark-300 hover:text-white rounded-lg transition-colors text-sm flex items-center gap-2"
        >
          <ArrowLeft size={16} /> Voltar para Oportunidades
        </button>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'blue';
      case 'won': return 'emerald';
      case 'lost': return 'rose';
      default: return 'gray';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'Aberta';
      case 'won': return 'Ganho';
      case 'lost': return 'Perdido';
      default: return status;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative z-10 w-full pb-10">
      {/* HEADER: Volta e Ações */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/opportunities')}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-dark-800 hover:bg-dark-700 border border-dark-700/50 text-dark-300 hover:text-white transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-dark-100">{opportunity.title || 'Oportunidade sem título'}</h1>
            <p className="text-dark-400 mt-0.5 text-sm">
              {opportunity.lead_name ? `Convertida do lead: ${opportunity.lead_name}` : 'Oportunidade direta'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEditModal(true)}
            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Edit2 size={16} /> Editar
          </button>
          <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-dark-800 hover:bg-dark-700 border border-dark-700/50 text-dark-300 hover:text-white transition-all">
            <MoreVertical size={18} />
          </button>
        </div>
      </div>

      {/* CONTEÚDO PRINCIPAL */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* LEFT INFO CARD */}
        <div className="xl:col-span-1">
          <div className="glass-card p-6 border border-white/5 rounded-2xl">
            <div className="space-y-6">
              {/* Valor e Probabilidade */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-dark-800/50 rounded-xl border border-dark-700/30">
                  <div className="text-xs text-dark-500 mb-1 flex items-center gap-1">
                    <DollarSign size={12} /> Valor
                  </div>
                  <div className="text-2xl font-bold text-dark-100">
                    R$ {Number(opportunity.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-dark-500 mt-1">{opportunity.currency || 'BRL'}</div>
                </div>
                <div className="p-4 bg-dark-800/50 rounded-xl border border-dark-700/30">
                  <div className="text-xs text-dark-500 mb-1 flex items-center gap-1">
                    <Percent size={12} /> Probabilidade
                  </div>
                  <div className="text-2xl font-bold text-dark-100">{opportunity.probability || 0}%</div>
                  <div className="w-full bg-dark-700 rounded-full h-1.5 mt-2">
                    <div
                      className="bg-emerald-500 h-1.5 rounded-full"
                      style={{ width: `${opportunity.probability || 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Estágio e Status */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-dark-500 mb-1 flex items-center gap-1">
                    <TrendingUp size={12} /> Estágio
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-sm font-medium"
                    style={{
                      backgroundColor: `${opportunity.stage_color || '#6366f1'}22`,
                      color: opportunity.stage_color || '#6366f1',
                      borderColor: `${opportunity.stage_color || '#6366f1'}44`
                    }}>
                    {opportunity.stage_name || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-dark-500 mb-1 flex items-center gap-1">
                    <Target size={12} /> Status
                  </div>
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border bg-${getStatusColor(opportunity.status)}-500/10 border-${getStatusColor(opportunity.status)}-500/20 text-${getStatusColor(opportunity.status)}-400 text-sm font-medium`}>
                    {getStatusLabel(opportunity.status)}
                  </div>
                </div>
              </div>

              {/* Informações da Oportunidade */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar size={16} className="text-dark-400 mt-0.5" />
                  <div>
                    <div className="text-xs text-dark-500">Fechamento Esperado</div>
                    <div className="text-sm font-medium text-dark-100">
                      {opportunity.expected_close ? new Date(opportunity.expected_close).toLocaleDateString('pt-BR') : '—'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User size={16} className="text-dark-400 mt-0.5" />
                  <div>
                    <div className="text-xs text-dark-500">Responsável</div>
                    <div className="text-sm font-medium text-dark-100">{opportunity.owner_name || '—'}</div>
                  </div>
                </div>

                {opportunity.lead_name && (
                  <div className="flex items-start gap-3">
                    <Building size={16} className="text-dark-400 mt-0.5" />
                    <div>
                      <div className="text-xs text-dark-500">Lead Origem</div>
                      <div className="text-sm font-medium text-dark-100">{opportunity.lead_name}</div>
                      <button
                        onClick={() => opportunity.lead_id && navigate(`/leads/${opportunity.lead_id}`)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 mt-1"
                      >
                        Ver lead
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Clock size={16} className="text-dark-400 mt-0.5" />
                  <div>
                    <div className="text-xs text-dark-500">Última Atividade</div>
                    <div className="text-sm font-medium text-dark-100">
                      {opportunity.last_activity_at ? new Date(opportunity.last_activity_at).toLocaleDateString('pt-BR') : 'Nenhuma'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tags */}
              {opportunity.tags && opportunity.tags.length > 0 && (
                <div className="pt-4 border-t border-dark-700/50">
                  <div className="text-xs text-dark-500 mb-2 flex items-center gap-1.5"><Tag size={12}/> Tags</div>
                  <div className="flex flex-wrap gap-1.5">
                    {opportunity.tags.map((tag: any, i: number) => (
                      <span
                        key={i}
                        className="text-xs px-2.5 py-1 rounded-full bg-dark-800 border flex items-center gap-1"
                        style={{
                          borderColor: `${tag.color}44`,
                          color: tag.color,
                          backgroundColor: `${tag.color}15`
                        }}
                      >
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notas */}
              {opportunity.notes && (
                <div className="pt-4 border-t border-dark-700/50">
                  <div className="text-xs text-dark-500 mb-2 flex items-center gap-1.5"><FileText size={12}/> Notas</div>
                  <div className="text-sm text-dark-300 bg-dark-800/30 p-3 rounded-lg border border-dark-700/50">
                    {opportunity.notes}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT TIMELINE CARD */}
        <div className="xl:col-span-2 space-y-6">
          {/* Tabs */}
          <div className="flex border-b border-dark-700/50">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-dark-400 hover:text-dark-200'}`}
            >
              Detalhes
            </button>
            <button
              onClick={() => setActiveTab('activities')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'activities' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-dark-400 hover:text-dark-200'}`}
            >
              Atividades
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'notes' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-dark-400 hover:text-dark-200'}`}
            >
              Notas
            </button>
          </div>

          {/* Conteúdo das Tabs */}
          {activeTab === 'details' && (
            <div className="glass-card p-6 border border-white/5 rounded-2xl">
              <h3 className="font-semibold text-dark-100 mb-4">Informações Detalhadas</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-dark-500 mb-1">Pipeline</div>
                  <div className="text-sm font-medium text-dark-100">{opportunity.pipeline_name || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-dark-500 mb-1">Fonte</div>
                  <div className="text-sm font-medium text-dark-100">{opportunity.source || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-dark-500 mb-1">Criado em</div>
                  <div className="text-sm font-medium text-dark-100">
                    {opportunity.created_at ? new Date(opportunity.created_at).toLocaleDateString('pt-BR') : '—'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-dark-500 mb-1">Atualizado em</div>
                  <div className="text-sm font-medium text-dark-100">
                    {opportunity.updated_at ? new Date(opportunity.updated_at).toLocaleDateString('pt-BR') : '—'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activities' && (
            <div className="glass-card p-6 border border-white/5 rounded-2xl">
              <h3 className="font-semibold text-dark-100 mb-4">Histórico de Atividades</h3>
              {activities && activities.length > 0 ? (
                <div className="space-y-4">
                  {activities.map((activity: any) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 bg-dark-800/30 rounded-lg border border-dark-700/50">
                      <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mt-0.5 flex-shrink-0">
                        {activity.type === 'call' ? <Phone size={14} /> :
                         activity.type === 'email' ? <Mail size={14} /> :
                         activity.type === 'meeting' ? <Calendar size={14} /> :
                         <MessageSquare size={14} />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <div className="font-medium text-dark-100">{activity.title}</div>
                          <div className="text-xs text-dark-500">
                            {new Date(activity.created_at).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                        <p className="text-sm text-dark-300 mt-1">{activity.description}</p>
                        {activity.user_name && (
                          <div className="text-xs text-dark-500 mt-2">Por: {activity.user_name}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-dark-400">
                  Nenhuma atividade registrada para esta oportunidade.
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="glass-card p-6 border border-white/5 rounded-2xl">
              <h3 className="font-semibold text-dark-100 mb-4">Anotações</h3>
              <div className="text-dark-400">
                Área para anotações adicionais sobre a oportunidade.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal de Edição */}
      <EditOpportunityModal
        opportunityId={id!}
        currentData={{
          title: opportunity.title,
          value: opportunity.value,
          probability: opportunity.probability,
          expected_close: opportunity.expected_close,
          notes: opportunity.notes,
          status: opportunity.status,
          owner_id: opportunity.owner_id,
          stage_id: opportunity.stage_id
        }}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
      />
    </div>
  );
}
