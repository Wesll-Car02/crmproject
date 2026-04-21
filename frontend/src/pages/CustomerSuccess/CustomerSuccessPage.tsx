import React, { useState } from 'react';
import { Heart, Activity, Search, Filter, AlertTriangle, MessageSquare, ArrowRight, UserCheck } from 'lucide-react';

export default function CustomerSuccessPage() {
  const accounts = [
    { id: '1', name: 'Tech Solutions Ltda', health: 92, status: 'healthy', mrr: 12500, lastContact: '2 dias atrás', nps: 10 },
    { id: '2', name: 'Global Retailers', health: 45, status: 'warning', mrr: 8400, lastContact: '15 dias atrás', nps: 6 },
    { id: '3', name: 'Alpha Industries', health: 18, status: 'danger', mrr: 3200, lastContact: '30 dias atrás', nps: 2 },
    { id: '4', name: 'Zeta Marketing', health: 78, status: 'healthy', mrr: 1500, lastContact: 'Hoje', nps: 8 },
  ];

  return (
    <div className="space-y-6 animate-fade-in relative z-10 w-full">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/20">
              <Heart size={20} className="text-white" />
            </div>
            Customer Success & NPS
          </h1>
          <p className="text-dark-400 mt-1 max-w-xl text-sm">Monitore a saúde da conta, previna churn e obtenha feedback via NPS.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Health Overview */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <KpiCard title="Contas Saudáveis" value="142" subtitle="82% da base" color="emerald" active />
            <KpiCard title="Contas em Risco" value="18" subtitle="Requerem ação" color="amber" />
            <KpiCard title="Churn (Mês)" value="3" subtitle="-1.2% MRR" color="rose" />
          </div>

          <div className="glass-card border border-white/5 overflow-hidden">
            <div className="p-4 border-b border-dark-700/50 flex flex-col sm:flex-row gap-3 justify-between items-center bg-dark-800/30">
              <h3 className="text-dark-100 font-medium flex items-center gap-2">
                <Activity size={18} className="text-pink-500" /> Saúde dos Clientes (Health Score)
              </h3>
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                  <input type="text" placeholder="Buscar cliente..." className="w-full bg-dark-900 border border-dark-700 rounded-lg pl-9 pr-3 py-1.5 text-sm text-dark-100 placeholder:text-dark-600 focus:outline-none focus:ring-1 focus:ring-pink-500" />
                </div>
                <button className="px-3 py-1.5 bg-dark-800 border border-dark-700 rounded-lg text-dark-300 hover:text-dark-100 transition-colors"><Filter size={16} /></button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-dark-700/50 bg-dark-800/20 text-xs uppercase tracking-wider text-dark-400">
                    <th className="px-5 py-3 font-medium">Cliente</th>
                    <th className="px-5 py-3 font-medium">Health Score</th>
                    <th className="px-5 py-3 font-medium">MRR Atual</th>
                    <th className="px-5 py-3 font-medium">Última Interação</th>
                    <th className="px-5 py-3 font-medium text-right">Acionar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700/30">
                  {accounts.map(a => (
                    <tr key={a.id} className="hover:bg-dark-800/40 transition-colors group">
                      <td className="px-5 py-3">
                        <div className="font-medium text-dark-100">{a.name}</div>
                        <div className="text-xs text-dark-400 flex items-center gap-1 mt-0.5">
                          {a.status === 'danger' && <AlertTriangle size={12} className="text-rose-500" />}
                          NPS: {a.nps}/10
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-full bg-dark-800 rounded-full h-1.5 max-w-[100px]">
                            <div 
                              className={`h-1.5 rounded-full ${a.status === 'healthy' ? 'bg-emerald-500' : a.status === 'warning' ? 'bg-amber-500' : 'bg-rose-500'}`} 
                              style={{ width: `${a.health}%` }}
                            ></div>
                          </div>
                          <span className={`text-sm font-medium ${a.status === 'healthy' ? 'text-emerald-400' : a.status === 'warning' ? 'text-amber-400' : 'text-rose-400'}`}>
                            {a.health}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-dark-200">
                        R$ {a.mrr.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-5 py-3 text-sm text-dark-300">
                        {a.lastContact}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button className="text-pink-500 hover:text-pink-400 font-medium text-sm flex items-center gap-1 ml-auto">
                          Atuar <ArrowRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: NPS Overview */}
        <div className="space-y-6">
          <div className="glass-card p-6 border border-white/5 bg-gradient-to-br from-dark-800 to-dark-900 border-t-2 border-t-pink-500">
            <h3 className="text-dark-100 font-medium flex items-center gap-2 mb-6">
              <MessageSquare size={18} className="text-pink-500" /> Relatório NPS (Net Promoter Score)
            </h3>
            
            <div className="flex flex-col items-center justify-center py-6">
              <div className="text-5xl font-black text-white mb-2 tracking-tight flex items-center gap-2">
                72 <span className="text-lg font-medium text-emerald-400">Excelente</span>
              </div>
              <p className="text-sm text-dark-400">+5 pontos vs último trimestre</p>
            </div>

            <div className="space-y-4 mt-4">
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-2 text-emerald-400"><UserCheck size={14}/> Promotores (9-10)</span>
                <span className="font-medium text-white">82%</span>
              </div>
              <div className="w-full bg-dark-800 rounded-full h-2">
                <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '82%' }}></div>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-2 text-amber-400"><UserCheck size={14}/> Neutros (7-8)</span>
                <span className="font-medium text-white">8%</span>
              </div>
              <div className="w-full bg-dark-800 rounded-full h-2">
                <div className="bg-amber-500 h-2 rounded-full" style={{ width: '8%' }}></div>
              </div>

              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-2 text-rose-400"><UserCheck size={14}/> Detratores (0-6)</span>
                <span className="font-medium text-white">10%</span>
              </div>
              <div className="w-full bg-dark-800 rounded-full h-2">
                <div className="bg-rose-500 h-2 rounded-full" style={{ width: '10%' }}></div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
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
