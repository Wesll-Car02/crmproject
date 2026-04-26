import { useQuery } from '@tanstack/react-query';
import { FileText, ExternalLink, Clock, CheckCircle2, Send, XCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { formatDate } from '../../utils/leadUtils';

interface LeadProposalsTabProps {
  lead: any;
}

const STATUS_CONFIG: Record<string, { label: string; icon: JSX.Element; color: string }> = {
  draft:    { label: 'Rascunho',  icon: <Clock size={13} />,        color: 'text-slate-400 bg-slate-400/10 border-slate-400/20' },
  sent:     { label: 'Enviada',   icon: <Send size={13} />,         color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  viewed:   { label: 'Visualizada', icon: <CheckCircle2 size={13} />, color: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20' },
  accepted: { label: 'Aceita',    icon: <CheckCircle2 size={13} />, color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' },
  rejected: { label: 'Recusada', icon: <XCircle size={13} />,      color: 'text-rose-400 bg-rose-400/10 border-rose-400/20' },
  expired:  { label: 'Expirada', icon: <AlertCircle size={13} />,  color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
};

export default function LeadProposalsTab({ lead }: LeadProposalsTabProps) {
  const navigate = useNavigate();

  let opportunityIds: string[] = [];
  try {
    const opps = typeof lead.converted_opportunities === 'string'
      ? JSON.parse(lead.converted_opportunities)
      : lead.converted_opportunities;
    if (Array.isArray(opps)) opportunityIds = opps.map((o: any) => o.id).filter(Boolean);
  } catch (_) {}

  const hasOpportunity = opportunityIds.length > 0;

  const { data: proposals = [], isLoading } = useQuery({
    queryKey: ['lead-proposals', lead.id],
    queryFn: async () => {
      const all = await api.get('/proposals').then(r => r.data);
      return all.filter((p: any) => opportunityIds.includes(p.opportunity_id));
    },
    enabled: hasOpportunity,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center p-10">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasOpportunity) {
    return (
      <div className="text-center py-12 bg-dark-800/20 border border-dark-700/50 rounded-xl">
        <FileText size={36} className="mx-auto mb-3 text-dark-500 opacity-40" />
        <p className="text-dark-300 font-medium">Lead ainda não foi convertido</p>
        <p className="text-sm text-dark-500 mt-1 max-w-xs mx-auto">
          Propostas são vinculadas a oportunidades. Converta este lead primeiro.
        </p>
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="text-center py-12 bg-dark-800/20 border border-dark-700/50 rounded-xl">
        <FileText size={36} className="mx-auto mb-3 text-dark-500 opacity-40" />
        <p className="text-dark-300 font-medium">Nenhuma proposta encontrada</p>
        <p className="text-sm text-dark-500 mt-1">As propostas criadas na oportunidade aparecerão aqui.</p>
        <button
          onClick={() => navigate('/proposals')}
          className="mt-4 text-sm text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1.5 mx-auto"
        >
          <ExternalLink size={14} /> Ir para Propostas
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-base font-semibold text-dark-100">Propostas</h3>
        <button
          onClick={() => navigate('/proposals')}
          className="text-xs text-dark-400 hover:text-indigo-400 transition-colors flex items-center gap-1"
        >
          <ExternalLink size={13} /> Ver todas
        </button>
      </div>

      {proposals.map((proposal: any) => {
        const status = STATUS_CONFIG[proposal.status] || STATUS_CONFIG.draft;
        const isExpired = proposal.valid_until && new Date(proposal.valid_until) < new Date() && proposal.status !== 'accepted';

        return (
          <div key={proposal.id} className="p-4 bg-dark-800/40 border border-dark-700/50 rounded-xl hover:border-dark-600 transition-colors">
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono text-dark-500">{proposal.number}</span>
                  <span
                    className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border ${isExpired ? STATUS_CONFIG.expired.color : status.color}`}
                  >
                    {isExpired ? STATUS_CONFIG.expired.icon : status.icon}
                    {isExpired ? STATUS_CONFIG.expired.label : status.label}
                  </span>
                </div>
                <p className="font-medium text-dark-100 mt-1 text-sm">{proposal.title}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-dark-500">
                  <span>Criada: {formatDate(proposal.created_at).split(' ')[0]}</span>
                  {proposal.valid_until && (
                    <span className={isExpired ? 'text-rose-400' : ''}>
                      Validade: {new Date(proposal.valid_until).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <div className="text-base font-bold text-emerald-400">
                  R$ {Number(proposal.total_value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <button
                  onClick={() => navigate('/proposals')}
                  className="mt-1 text-xs text-dark-400 hover:text-indigo-400 transition-colors flex items-center gap-1 ml-auto"
                >
                  <ExternalLink size={12} /> Ver
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
