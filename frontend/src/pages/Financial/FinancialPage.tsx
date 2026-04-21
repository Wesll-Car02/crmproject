import React, { useState } from 'react';
import { DollarSign, TrendingUp, CreditCard, FileText, BarChart3, Receipt, Download, Plus, Search, Filter } from 'lucide-react';

export default function FinancialPage() {
  const [activeTab, setActiveTab] = useState<'billings' | 'mrr' | 'commissions' | 'forecast'>('billings');

  // Mock data for demo purposes
  const billings = [
    { id: '1', number: 'FAT-20261042', contact: 'Tech Solutions Ltda', amount: 12500.00, dueDate: '2026-05-10', status: 'pending' },
    { id: '2', number: 'FAT-20261043', contact: 'Global Retailers', amount: 8400.50, dueDate: '2026-04-15', status: 'paid' },
    { id: '3', number: 'FAT-20261039', contact: 'Alpha Industries', amount: 3200.00, dueDate: '2026-03-30', status: 'overdue' },
  ];

  return (
    <div className="space-y-6 animate-fade-in relative z-10 w-full">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <DollarSign size={20} className="text-white" />
            </div>
            Financeiro
          </h1>
          <p className="text-dark-400 mt-1 max-w-xl text-sm">Controle de recebíveis, previsibilidade de receita e comissionamento.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 bg-dark-800 border border-dark-700 hover:bg-dark-700 text-dark-200 rounded-lg font-medium transition-all text-sm">
            Exportar Relatório
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-emerald-500/25 cursor-pointer hover:-translate-y-0.5">
            <Plus size={18} />
            <span>Nova Fatura</span>
          </button>
        </div>
      </div>

      {/* TABS CONTROLLER */}
      <div className="flex overflow-x-auto hide-scrollbar gap-2 p-1 bg-dark-800/30 rounded-xl border border-white/5 w-max">
        <TabButton active={activeTab === 'billings'} onClick={() => setActiveTab('billings')} icon={<Receipt size={16} />} label="Cobranças" />
        <TabButton active={activeTab === 'mrr'} onClick={() => setActiveTab('mrr')} icon={<TrendingUp size={16} />} label="Recorrência (MRR)" />
        <TabButton active={activeTab === 'commissions'} onClick={() => setActiveTab('commissions')} icon={<CreditCard size={16} />} label="Comissões" />
        <TabButton active={activeTab === 'forecast'} onClick={() => setActiveTab('forecast')} icon={<BarChart3 size={16} />} label="Forecasting" />
      </div>

      {/* CONTENT: BILLINGS (COBRANÇAS) */}
      {activeTab === 'billings' && (
        <div className="space-y-6 animate-fade-in">
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiCard title="A Receber (Mês)" value="R$ 45.200,00" subtitle="12 faturas pendentes" active/>
            <KpiCard title="Inadimplência" value="R$ 3.200,00" subtitle="2 faturas atrasadas" color="rose" />
            <KpiCard title="Recebido (Mês)" value="R$ 82.500,00" subtitle="+15% vs mês anterior" color="emerald" />
          </div>

          {/* TABLE AREA */}
          <div className="glass-card border border-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row gap-3 justify-between items-center bg-dark-800/30">
              <h3 className="text-dark-100 font-medium flex items-center gap-2">
                <FileText size={18} className="text-emerald-500" /> Faturas Emitidas
              </h3>
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                  <input type="text" placeholder="Buscar fatura..." className="w-full bg-dark-900 border border-dark-700 rounded-lg pl-9 pr-3 py-1.5 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-emerald-500" />
                </div>
                <button className="px-3 py-1.5 bg-dark-800 border border-dark-700 rounded-lg text-dark-300 hover:text-dark-100 transition-colors"><Filter size={16} /></button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-dark-700/50 bg-dark-800/20 text-xs uppercase tracking-wider text-dark-400">
                    <th className="px-5 py-3 font-medium">Nº Fatura</th>
                    <th className="px-5 py-3 font-medium">Cliente</th>
                    <th className="px-5 py-3 font-medium">Valor</th>
                    <th className="px-5 py-3 font-medium">Vencimento</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 font-medium text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700/30">
                  {billings.map(b => (
                    <tr key={b.id} className="hover:bg-dark-800/40 transition-colors group">
                      <td className="px-5 py-3 text-sm font-mono text-dark-200">{b.number}</td>
                      <td className="px-5 py-3 text-sm font-medium text-dark-100">{b.contact}</td>
                      <td className="px-5 py-3 text-sm text-dark-200">R$ {b.amount.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                      <td className="px-5 py-3 text-sm text-dark-300">{b.dueDate.split('-').reverse().join('/')}</td>
                      <td className="px-5 py-3">
                         {b.status === 'paid' && <span className="text-xs px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20">Pago</span>}
                         {b.status === 'pending' && <span className="text-xs px-2 py-1 bg-amber-500/10 text-amber-400 rounded-md border border-amber-500/20">Pendente</span>}
                         {b.status === 'overdue' && <span className="text-xs px-2 py-1 bg-rose-500/10 text-rose-400 rounded-md border border-rose-500/20">Atrasado</span>}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button className="text-dark-500 hover:text-emerald-400 transition-colors p-1" title="Baixar Boleto"><Download size={18} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CONTENT: MRR */}
      {activeTab === 'mrr' && (
        <div className="flex flex-col items-center justify-center p-16 text-center border-2 border-dashed border-dark-700 bg-dark-800/20 rounded-2xl">
          <div className="w-16 h-16 bg-blue-500/10 text-blue-500 flex items-center justify-center rounded-2xl mb-4"><TrendingUp size={32}/></div>
          <h2 className="text-xl font-medium text-dark-100 mb-2">Módulo de Recorrência Integrado</h2>
          <p className="text-dark-400 max-w-sm mb-4">Gerencie as assinaturas ativas para calcular o MRR real, churn rate e histórico de upgrades/downgrades.</p>
          <div className="text-sm px-3 py-1 bg-dark-800 text-dark-300 rounded border border-dark-700">UI mock em implementação pelas APIs backend criadas</div>
        </div>
      )}

      {/* CONTENT: COMMISSIONS & FORECAST FALLBACKS */}
      {(activeTab === 'commissions' || activeTab === 'forecast') && (
        <div className="flex flex-col items-center justify-center p-16 text-center border-2 border-dashed border-dark-700 bg-dark-800/20 rounded-2xl">
          <div className="animate-pulse w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4" />
          <h2 className="text-lg text-dark-200">Carregando painel de {activeTab}...</h2>
        </div>
      )}

    </div>
  );
}

// Subcomponents helper

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
        active 
        ? 'bg-dark-700 text-white shadow-sm' 
        : 'text-dark-400 hover:text-dark-200 hover:bg-dark-700/50'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function KpiCard({ title, value, subtitle, color = 'emerald', active = false }: any) {
  return (
    <div className={`p-5 rounded-2xl border ${active ? `bg-${color}-900/10 border-${color}-500/20` : 'bg-dark-800/40 border-white/5'} flex flex-col justify-between overflow-hidden relative group`}>
      <div className={`absolute -right-6 -top-6 w-24 h-24 bg-${color}-500/10 rounded-full blur-2xl group-hover:bg-${color}-500/20 transition-all`} />
      <span className="text-sm font-medium text-dark-400 mb-2">{title}</span>
      <span className="text-3xl font-bold text-dark-100 mb-1">{value}</span>
      <span className={`text-xs font-medium text-${color}-400`}>{subtitle}</span>
    </div>
  );
}
