import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart2, TrendingUp, Users, MessageSquare } from 'lucide-react';
import api from '../../lib/api';

type Tab = 'leads' | 'opportunities' | 'chat' | 'team';

export default function AnalyticsPage() {
  const [tab, setTab] = useState<Tab>('leads');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const params = { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined };

  const { data: leadsData } = useQuery({
    queryKey: ['analytics-leads', dateFrom, dateTo],
    queryFn: () => api.get('/analytics/leads', { params }).then(r => r.data),
    enabled: tab === 'leads',
  });

  const { data: oppsData } = useQuery({
    queryKey: ['analytics-opportunities', dateFrom, dateTo],
    queryFn: () => api.get('/analytics/opportunities', { params }).then(r => r.data),
    enabled: tab === 'opportunities',
  });

  const { data: chatData } = useQuery({
    queryKey: ['analytics-chat', dateFrom, dateTo],
    queryFn: () => api.get('/analytics/chat', { params }).then(r => r.data),
    enabled: tab === 'chat',
  });

  const { data: teamData = [] } = useQuery({
    queryKey: ['analytics-team'],
    queryFn: () => api.get('/analytics/team').then(r => r.data),
    enabled: tab === 'team',
  });

  const formatCurrency = (v: number) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-500/10 flex items-center justify-center">
              <BarChart2 size={20} className="text-primary-400" />
            </div>
            Analytics
          </h1>
          <p className="page-subtitle">Relatórios e métricas do CRM</p>
        </div>
        <div className="flex gap-3">
          <input type="date" className="input-field text-sm" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <input type="date" className="input-field text-sm" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
      </div>

      {/* Tab selector */}
      <div className="glass-card p-1 flex gap-1 w-fit">
        {([
          { id: 'leads', label: 'Leads', icon: Users },
          { id: 'opportunities', label: 'Oportunidades', icon: TrendingUp },
          { id: 'chat', label: 'Chat', icon: MessageSquare },
          { id: 'team', label: 'Equipe', icon: Users },
        ] as const).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg font-medium transition-colors ${tab === t.id ? 'bg-primary-500 text-white' : 'text-dark-400 hover:text-dark-200'}`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Leads tab */}
      {tab === 'leads' && leadsData && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="glass-card p-4">
              <p className="text-xs text-dark-400 mb-1">Total de Leads</p>
              <p className="text-2xl font-bold text-dark-100">{leadsData.totals?.total || 0}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-dark-400 mb-1">Convertidos</p>
              <p className="text-2xl font-bold text-green-400">{leadsData.totals?.converted || 0}</p>
            </div>
            <div className="glass-card p-4">
              <p className="text-xs text-dark-400 mb-1">Score Médio</p>
              <p className="text-2xl font-bold text-primary-400">{Math.round(leadsData.totals?.avg_score || 0)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass-card p-4">
              <h3 className="text-sm font-medium text-dark-200 mb-3">Por Status</h3>
              <div className="space-y-2">
                {(leadsData.byStatus || []).map((row: any) => (
                  <div key={row.status} className="flex items-center justify-between">
                    <span className="text-sm text-dark-300 capitalize">{row.status}</span>
                    <span className="text-sm font-medium text-dark-100">{row.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-card p-4">
              <h3 className="text-sm font-medium text-dark-200 mb-3">Por Origem</h3>
              <div className="space-y-2">
                {(leadsData.bySource || []).map((row: any) => (
                  <div key={row.source} className="flex items-center justify-between">
                    <span className="text-sm text-dark-300 capitalize">{row.source}</span>
                    <span className="text-sm font-medium text-dark-100">{row.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <h3 className="text-sm font-medium text-dark-200 mb-3">Evolução Diária</h3>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {(leadsData.byDay || []).map((row: any) => (
                <div key={row.date} className="flex items-center justify-between py-1 border-b border-dark-700/50">
                  <span className="text-sm text-dark-300">{new Date(row.date).toLocaleDateString('pt-BR')}</span>
                  <div className="flex items-center gap-2">
                    <div className="h-2 bg-primary-500/60 rounded" style={{ width: `${Math.min(Number(row.count) * 10, 100)}px` }} />
                    <span className="text-sm font-medium text-dark-100 w-6 text-right">{row.count}</span>
                  </div>
                </div>
              ))}
              {(!leadsData.byDay || leadsData.byDay.length === 0) && (
                <p className="text-sm text-dark-400 text-center py-4">Nenhum dado disponível</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Opportunities tab */}
      {tab === 'opportunities' && oppsData && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Total', value: oppsData.totals?.total || 0 },
              { label: 'Ganhos', value: oppsData.totals?.won || 0 },
              { label: 'Perdidos', value: oppsData.totals?.lost || 0 },
              { label: 'Receita', value: formatCurrency(oppsData.totals?.won_value) },
            ].map(s => (
              <div key={s.label} className="glass-card p-4">
                <p className="text-xs text-dark-400 mb-1">{s.label}</p>
                <p className="text-xl font-bold text-dark-100">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="glass-card p-4">
            <h3 className="text-sm font-medium text-dark-200 mb-3">Por Etapa do Funil</h3>
            <div className="space-y-3">
              {(oppsData.byStage || []).map((row: any) => (
                <div key={row.stage} className="flex items-center gap-3">
                  <span className="text-sm text-dark-300 w-32 truncate">{row.stage}</span>
                  <div className="flex-1 h-2 bg-dark-700 rounded overflow-hidden">
                    <div className="h-full bg-primary-500 rounded" style={{ width: `${Math.min(Number(row.count) * 10, 100)}%` }} />
                  </div>
                  <span className="text-sm text-dark-200 w-8 text-right">{row.count}</span>
                  <span className="text-sm text-dark-400 w-28 text-right">{formatCurrency(row.total_value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Chat tab */}
      {tab === 'chat' && chatData && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total de Conversas', value: chatData.totals?.total_conversations || 0 },
              { label: 'Abertas', value: chatData.totals?.open || 0 },
              { label: 'Resolvidas', value: chatData.totals?.resolved || 0 },
            ].map(s => (
              <div key={s.label} className="glass-card p-4">
                <p className="text-xs text-dark-400 mb-1">{s.label}</p>
                <p className="text-2xl font-bold text-dark-100">{s.value}</p>
              </div>
            ))}
          </div>
          <div className="glass-card p-4">
            <h3 className="text-sm font-medium text-dark-200 mb-3">Por Canal</h3>
            <div className="space-y-2">
              {(chatData.byChannel || []).map((row: any) => (
                <div key={row.channel} className="flex items-center justify-between">
                  <span className="text-sm text-dark-300 capitalize">{row.channel || 'webchat'}</span>
                  <span className="text-sm text-dark-100">{row.conversations} conversas · {row.messages} msgs</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Team tab */}
      {tab === 'team' && (
        <div className="glass-card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-left px-4 py-3 text-xs font-medium text-dark-400 uppercase">Vendedor</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-dark-400 uppercase">Leads</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-dark-400 uppercase">Oportunidades</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-dark-400 uppercase">Ganhos</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-dark-400 uppercase">Receita</th>
              </tr>
            </thead>
            <tbody>
              {(teamData as any[]).length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-dark-400">Nenhum dado</td></tr>
              ) : (teamData as any[]).map((row: any) => (
                <tr key={row.name} className="border-b border-dark-700/50 hover:bg-dark-700/30">
                  <td className="px-4 py-3 text-sm font-medium text-dark-100">{row.name}</td>
                  <td className="px-4 py-3 text-sm text-right text-dark-300">{row.leads}</td>
                  <td className="px-4 py-3 text-sm text-right text-dark-300">{row.opportunities}</td>
                  <td className="px-4 py-3 text-sm text-right text-green-400">{row.won}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium text-dark-100">{formatCurrency(row.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
