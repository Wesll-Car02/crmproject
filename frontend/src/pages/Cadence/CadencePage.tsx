import React, { useState } from 'react';
import { Target, Play, Pause, Plus, Search, Filter, Mail, MessageCircle, Phone, CheckSquare } from 'lucide-react';

export default function CadencePage() {
  const cadences = [
    { id: '1', name: 'Inbound Leads (Quentes)', status: 'active', enrolled: 45, steps: 4, openRate: '42%', replyRate: '15%' },
    { id: '2', name: 'Prospecção B2B (Frios)', status: 'active', enrolled: 120, steps: 7, openRate: '18%', replyRate: '2%' },
    { id: '3', name: 'Recuperação de Churn', status: 'paused', enrolled: 12, steps: 3, openRate: '55%', replyRate: '8%' },
  ];

  return (
    <div className="space-y-6 animate-fade-in relative z-10 w-full">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Target size={20} className="text-white" />
            </div>
            Cadência de Prospecção (SDR)
          </h1>
          <p className="text-dark-400 mt-1 max-w-xl text-sm">Sequências automáticas multicanal para engajar leads e escalar vendas.</p>
        </div>
        
        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-orange-500/25 cursor-pointer hover:-translate-y-0.5">
          <Plus size={18} />
          <span>Criar Cadência</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard title="Leads Ativos (Total)" value="177" subtitle="+12 hoje" color="orange" active />
        <KpiCard title="Taxa Média de Resposta" value="8.3%" subtitle="Últimos 30 dias" color="emerald" />
        <KpiCard title="Reuniões Agendadas" value="24" subtitle="Origem: Cadências" color="blue" />
      </div>

      {/* FILTER BAR */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input 
            type="text" 
            placeholder="Buscar cadências..."
            className="w-full bg-dark-800/50 border border-dark-700/50 rounded-lg pl-10 pr-4 py-2.5 text-dark-100 placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
          />
        </div>
        <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-dark-800/50 hover:bg-dark-700/50 border border-dark-700/50 text-dark-200 rounded-lg font-medium transition-all whitespace-nowrap">
          <Filter size={18} />
          <span>Filtros</span>
        </button>
      </div>

      {/* CADENCES LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {cadences.map(c => (
          <div key={c.id} className="glass-card p-5 border border-white/5 hover:border-dark-600 transition-all group flex flex-col justify-between h-full cursor-pointer">
            <div>
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-dark-100">{c.name}</h3>
                {c.status === 'active' ? (
                  <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-xs border border-emerald-500/20 flex items-center gap-1"><Play size={10}/> Ativa</span>
                ) : (
                  <span className="bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded text-xs border border-amber-500/20 flex items-center gap-1"><Pause size={10}/> Pausada</span>
                )}
              </div>
              
              {/* STEPS PREVIEW MAP (visual mockup) */}
              <div className="flex items-center gap-1 mb-5">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400" title="Email"><Mail size={12}/></div>
                <div className="w-4 h-0.5 bg-dark-700"></div>
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400" title="WhatsApp"><MessageCircle size={12}/></div>
                <div className="w-4 h-0.5 bg-dark-700"></div>
                <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400" title="Ligação"><Phone size={12}/></div>
                <div className="text-xs text-dark-500 ml-1">+{Math.max(0, c.steps - 3)} passos</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-dark-700/50 mt-auto">
              <div>
                <div className="text-xs text-dark-400 mb-0.5">Leads</div>
                <div className="font-medium text-dark-100">{c.enrolled}</div>
              </div>
              <div>
                <div className="text-xs text-dark-400 mb-0.5">Open Rate</div>
                <div className="font-medium text-dark-100">{c.openRate}</div>
              </div>
              <div>
                <div className="text-xs text-dark-400 mb-0.5">Reply Rate</div>
                <div className="font-medium text-dark-100">{c.replyRate}</div>
              </div>
            </div>
          </div>
        ))}

        {/* BUILDER PREVIEW / NEW CTA */}
        <div className="glass-card p-5 border border-dashed border-dark-600 bg-dark-800/10 hover:bg-dark-800/30 transition-all flex flex-col items-center justify-center text-center cursor-pointer min-h-[220px]">
          <div className="w-12 h-12 rounded-full bg-dark-700 flex items-center justify-center text-dark-300 mb-3 group-hover:scale-110 transition-transform">
            <Plus size={24} />
          </div>
          <h3 className="font-semibold text-dark-200">Criar do Zero</h3>
          <p className="text-sm text-dark-400 mt-1 max-w-[200px]">Arraste e solte nós para construir fluxos complexos</p>
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
