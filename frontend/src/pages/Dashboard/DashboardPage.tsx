import { useQuery } from '@tanstack/react-query';
import {
  Users, Target, DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight,
  MessageSquare, Calendar, Zap, Bot, Activity, ChevronRight, Flame
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell
} from 'recharts';
import api from '../../lib/api';
import { useAuthStore } from '../../store/authStore';
import { clsx } from 'clsx';

// Mock data for visual demonstration
const revenueData = [
  { month: 'Set', value: 42000 },
  { month: 'Out', value: 58000 },
  { month: 'Nov', value: 51000 },
  { month: 'Dez', value: 72000 },
  { month: 'Jan', value: 65000 },
  { month: 'Fev', value: 89000 },
  { month: 'Mar', value: 94000 },
];

const stagesData = [
  { name: 'Prospecção', value: 48, color: '#6366f1' },
  { name: 'Qualificação', value: 29, color: '#8b5cf6' },
  { name: 'Proposta', value: 16, color: '#ec4899' },
  { name: 'Negociação', value: 10, color: '#f59e0b' },
  { name: 'Fechamento', value: 7, color: '#10b981' },
];

const kpis = [
  {
    title: 'Total de Leads',
    value: '1.284',
    change: '+12.5%',
    trend: 'up',
    icon: Users,
    color: 'primary',
    bg: 'bg-primary-500/10',
    iconColor: 'text-primary-400',
  },
  {
    title: 'Oportunidades',
    value: '243',
    change: '+8.2%',
    trend: 'up',
    icon: Target,
    color: 'violet',
    bg: 'bg-violet-500/10',
    iconColor: 'text-violet-400',
  },
  {
    title: 'Receita Prev.',
    value: 'R$ 94k',
    change: '+18.3%',
    trend: 'up',
    icon: DollarSign,
    color: 'emerald',
    bg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-400',
  },
  {
    title: 'Taxa Conversão',
    value: '23.4%',
    change: '-2.1%',
    trend: 'down',
    icon: TrendingUp,
    color: 'amber',
    bg: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
  },
];

const recentActivities = [
  { type: 'lead', text: 'Novo lead: Maria Silva via WhatsApp', time: '2min', icon: Users, color: 'text-primary-400' },
  { type: 'deal', text: 'Oportunidade "Projeto Alpha" avançou para Proposta', time: '18min', icon: Target, color: 'text-violet-400' },
  { type: 'message', text: '3 novas mensagens de clientes no chat', time: '32min', icon: MessageSquare, color: 'text-sky-400' },
  { type: 'schedule', text: 'Reunião com TechCorp às 15:00', time: '1h', icon: Calendar, color: 'text-amber-400' },
  { type: 'automation', text: 'Automação "Follow-up 3 dias" disparou para 12 leads', time: '2h', icon: Zap, color: 'text-emerald-400' },
];

const topReps = [
  { name: 'Carlos Oliveira', deals: 14, value: 'R$ 32.000', avatar: 'CO' },
  { name: 'Ana Santos', deals: 11, value: 'R$ 28.500', avatar: 'AS' },
  { name: 'Roberto Lima', deals: 9, value: 'R$ 24.000', avatar: 'RL' },
  { name: 'Juliana Ferreira', deals: 8, value: 'R$ 19.800', avatar: 'JF' },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card p-3 text-xs">
        <p className="text-dark-300 mb-1">{label}</p>
        <p className="text-primary-400 font-semibold">
          R$ {payload[0].value.toLocaleString('pt-BR')}
        </p>
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const { user } = useAuthStore();

  const { data: statsData } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => api.get('/dashboard/stats').then(r => r.data),
    refetchInterval: 60000,
  });

  const { data: oppsChart = stagesData } = useQuery({
    queryKey: ['dashboard-opps-chart'],
    queryFn: () => api.get('/dashboard/opps-chart').then(r =>
      r.data.map((s: any, i: number) => ({ name: s.stage, value: Number(s.count), color: ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981'][i % 5] }))
    ),
  });

  const { data: activityData = recentActivities } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: () => api.get('/dashboard/activity').then(r =>
      r.data.map((a: any) => ({
        type: a.type, text: `${a.type === 'lead' ? 'Novo lead' : 'Oportunidade'}: ${a.title}`,
        time: new Date(a.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        icon: a.type === 'lead' ? Users : Target,
        color: a.type === 'lead' ? 'text-primary-400' : 'text-violet-400',
      }))
    ),
  });

  const s = statsData?.leads;
  const o = statsData?.opportunities;
  const t = statsData?.tasks;

  const liveKpis = [
    { title: 'Total de Leads', value: s?.total_leads ? Number(s.total_leads).toLocaleString('pt-BR') : kpis[0].value, change: s?.leads_this_week ? `+${s.leads_this_week} essa semana` : kpis[0].change, trend: 'up' as const, icon: Users, color: 'primary', bg: 'bg-primary-500/10', iconColor: 'text-primary-400' },
    { title: 'Oportunidades', value: o?.open_opps ? Number(o.open_opps).toLocaleString('pt-BR') : kpis[1].value, change: o?.won_opps ? `${o.won_opps} fechados` : kpis[1].change, trend: 'up' as const, icon: Target, color: 'violet', bg: 'bg-violet-500/10', iconColor: 'text-violet-400' },
    { title: 'Pipeline (Aberto)', value: o?.pipeline_value ? `R$ ${(Number(o.pipeline_value)/1000).toFixed(0)}k` : kpis[2].value, change: o?.won_this_month ? `R$ ${(Number(o.won_this_month)/1000).toFixed(0)}k ganhos/mês` : kpis[2].change, trend: 'up' as const, icon: DollarSign, color: 'emerald', bg: 'bg-emerald-500/10', iconColor: 'text-emerald-400' },
    { title: 'Tarefas Pendentes', value: t?.pending_tasks ? Number(t.pending_tasks).toLocaleString('pt-BR') : kpis[3].value, change: t?.overdue_tasks ? `${t.overdue_tasks} atrasadas` : kpis[3].change, trend: t?.overdue_tasks > 0 ? 'down' as const : 'up' as const, icon: TrendingUp, color: 'amber', bg: 'bg-amber-500/10', iconColor: 'text-amber-400' },
  ];

  const displayActivities = activityData.length > 0 ? activityData : recentActivities;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-50">
            Bom dia, {user?.firstName}! 👋
          </h1>
          <p className="text-dark-400 text-sm mt-0.5">
            Aqui está um resumo da sua operação hoje.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            Sistema operacional
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {liveKpis.map((kpi) => (
          <div
            key={kpi.title}
            className="kpi-card group cursor-pointer hover:scale-[1.02] transition-transform"
            onClick={() => {
              // Navegar para página relevante baseada no KPI
              if (kpi.title.includes('Leads')) window.location.href = '/leads';
              else if (kpi.title.includes('Oportunidades')) window.location.href = '/opportunities';
              else if (kpi.title.includes('Receita') || kpi.title.includes('Pipeline')) window.location.href = '/financial';
              else if (kpi.title.includes('Tarefas')) window.location.href = '/scheduling';
            }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', kpi.bg)}>
                <kpi.icon size={20} className={kpi.iconColor} />
              </div>
              <div className={clsx(
                'flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                kpi.trend === 'up'
                  ? 'text-emerald-400 bg-emerald-500/10'
                  : 'text-red-400 bg-red-500/10'
              )}>
                {kpi.trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                {kpi.change}
              </div>
            </div>
            <p className="text-3xl font-bold text-dark-50 mb-1">{kpi.value}</p>
            <p className="text-sm text-dark-400">{kpi.title}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Revenue Chart */}
        <div className="xl:col-span-2 glass-card p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-dark-100">Receita Mensal</h3>
              <p className="text-xs text-dark-500 mt-0.5">Últimos 7 meses</p>
            </div>
            <div className="flex gap-2">
              {['3M', '6M', '1A'].map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    // Atualizar período do gráfico
                    console.log(`Mudar período para: ${t}`);
                    // Em uma implementação real, faria uma nova requisição com o período
                  }}
                  className={clsx('px-2.5 py-1 text-xs rounded-lg transition-colors', t === '6M' ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30' : 'text-dark-500 hover:text-dark-300 hover:bg-dark-800')}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone" dataKey="value" stroke="#6366f1" fill="url(#revenueGrad)"
                strokeWidth={2.5} dot={{ fill: '#6366f1', strokeWidth: 0, r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pipeline Funnel */}
        <div className="glass-card p-5">
          <h3 className="font-semibold text-dark-100 mb-1">Funil de Vendas</h3>
          <p className="text-xs text-dark-500 mb-5">Por etapa do pipeline</p>
          <div className="space-y-3">
            {stagesData.map((stage) => (
              <div key={stage.name}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-dark-300">{stage.name}</span>
                  <span className="text-dark-400">{stage.value}</span>
                </div>
                <div className="progress">
                  <div
                    className="progress-bar"
                    style={{ width: `${(stage.value / 48) * 100}%`, backgroundColor: stage.color }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-dark-700/50">
            <div className="flex justify-between items-center">
              <span className="text-xs text-dark-400">Total no funil</span>
              <span className="text-sm font-semibold text-dark-100">R$ 456.000</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Recent Activity */}
        <div className="xl:col-span-2 glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-dark-100 flex items-center gap-2">
              <Activity size={16} className="text-primary-400" />
              Atividade Recente
            </h3>
            <button
              onClick={() => {
                // Navegar para página de atividades
                window.location.href = '/scheduling';
              }}
              className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
            >
              Ver tudo <ChevronRight size={12} />
            </button>
          </div>
          <div className="space-y-1">
            {recentActivities.map((activity, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-dark-800/40 transition-colors group">
                <div className={clsx('w-7 h-7 rounded-lg bg-dark-700/60 flex items-center justify-center flex-shrink-0', activity.color)}>
                  <activity.icon size={13} />
                </div>
                <p className="text-sm text-dark-300 flex-1">{activity.text}</p>
                <span className="text-xs text-dark-600 flex-shrink-0">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Reps */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Flame size={16} className="text-amber-400" />
            <h3 className="font-semibold text-dark-100">Top Vendedores</h3>
          </div>
          <div className="space-y-3">
            {topReps.map((rep, i) => (
              <div key={rep.name} className="flex items-center gap-3">
                <span className="text-xs text-dark-600 w-4 text-center">{i + 1}</span>
                <div className="w-7 h-7 rounded-full bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-xs text-primary-300 font-medium flex-shrink-0">
                  {rep.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dark-200 truncate">{rep.name}</p>
                  <p className="text-xs text-dark-500">{rep.deals} negócios</p>
                </div>
                <span className="text-xs font-semibold text-emerald-400">{rep.value}</span>
              </div>
            ))}
          </div>

          {/* AI Insight */}
          <div className="mt-4 p-3 rounded-xl bg-primary-500/5 border border-primary-500/15">
            <div className="flex items-center gap-2 mb-1.5">
              <Bot size={13} className="text-primary-400" />
              <span className="text-xs font-medium text-primary-300">Insight IA</span>
            </div>
            <p className="text-xs text-dark-400 leading-relaxed">
              Carlos tem 3 oportunidades em negociação há mais de 7 dias. Sugiro agendar um follow-up.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
