import React, { useState, useEffect } from 'react';
import { FileText, Plus, Search, Filter, MoreVertical, Download, CheckCircle, Clock, XCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

export default function ContractsPage() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Mock fetch function (replace with real API call later using Axios/fetch)
  const fetchContracts = async () => {
    try {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        setContracts([
          {
            id: '1',
            number: 'CTR-2026-4021',
            title: 'Contrato de Licenciamento SaaS - Enterprise',
            contact_name: 'Tech Solutions Ltda',
            status: 'active',
            value: 12500.00,
            start_date: '2026-01-15T00:00:00.000Z',
            end_date: '2027-01-15T00:00:00.000Z',
          },
          {
            id: '2',
            number: 'CTR-2026-8932',
            title: 'Implementação de CRM e Onboarding',
            contact_name: 'Global Retailers',
            status: 'draft',
            value: 8000.00,
            start_date: '2026-04-20T00:00:00.000Z',
            end_date: '2026-10-20T00:00:00.000Z',
          },
          {
            id: '3',
            number: 'CTR-2025-1044',
            title: 'Suporte Premium Anual',
            contact_name: 'Alpha Industries',
            status: 'expired',
            value: 4500.00,
            start_date: '2025-02-10T00:00:00.000Z',
            end_date: '2026-02-10T00:00:00.000Z',
          }
        ]);
        setLoading(false);
      }, 800);
    } catch (error) {
      console.error('Error fetching contracts');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs font-medium"><CheckCircle size={14} /> Ativo</span>;
      case 'draft':
        return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 text-xs font-medium"><Clock size={14} /> Minuta</span>;
      case 'expired':
        return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 text-xs font-medium"><XCircle size={14} /> Expirado</span>;
      case 'renewed':
        return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 text-xs font-medium"><RefreshCw size={14} /> Renovado</span>;
      default:
        return <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-dark-500/10 text-dark-400 border border-dark-500/20 text-xs font-medium">Bascunho</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in relative z-10">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <FileText size={20} className="text-white" />
            </div>
            Gestão de Contratos
          </h1>
          <p className="text-dark-400 mt-1 max-w-xl text-sm">Crie, gerencie vigências e acompanhe assinaturas digitais dos contratos com seus clientes.</p>
        </div>
        
        <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-indigo-500/25 cursor-pointer hover:-translate-y-0.5">
          <Plus size={18} />
          <span>Novo Contrato</span>
        </button>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { title: 'Contratos Ativos', value: '42', subtitle: 'R$ 145.200,00 MRR', color: 'emerald' },
          { title: 'Minutas P/ Assinar', value: '8', subtitle: 'Aguardando cliente', color: 'amber' },
          { title: 'Vencendo em 30 d', value: '3', subtitle: 'Revisar urgência', color: 'rose' },
          { title: 'Renovados Mês', value: '12', subtitle: 'Retenção +5%', color: 'blue' }
        ].map((card, i) => (
          <div key={i} className="glass-card p-5 border border-white/5 relative overflow-hidden group">
            <div className={`absolute top-0 right-0 w-32 h-32 bg-${card.color}-500/10 rounded-full blur-2xl -mr-16 -mt-16 transition-all group-hover:bg-${card.color}-500/20`} />
            <h4 className="text-dark-400 text-sm font-medium mb-1">{card.title}</h4>
            <div className="text-3xl font-bold text-dark-100 mb-1">{card.value}</div>
            <div className={`text-xs text-${card.color}-400 font-medium`}>{card.subtitle}</div>
          </div>
        ))}
      </div>

      {/* FILTERS & SEARCH */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input 
            type="text" 
            placeholder="Buscar por título, número ou cliente..."
            className="w-full bg-dark-800/50 border border-dark-700/50 rounded-lg pl-10 pr-4 py-2.5 text-dark-100 placeholder:text-dark-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="flex items-center justify-center gap-2 px-4 py-2.5 bg-dark-800/50 hover:bg-dark-700/50 border border-dark-700/50 text-dark-200 rounded-lg font-medium transition-all whitespace-nowrap">
          <Filter size={18} />
          <span>Filtros</span>
        </button>
      </div>

      {/* TABLE */}
      <div className="glass-card border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-dark-700/50 bg-dark-800/30">
                <th className="px-5 py-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">Número / Título</th>
                <th className="px-5 py-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">Cliente</th>
                <th className="px-5 py-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">Status</th>
                <th className="px-5 py-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">Valor</th>
                <th className="px-5 py-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">Vigência</th>
                <th className="px-5 py-4 text-xs font-semibold text-dark-400 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700/30">
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-5 py-4"><div className="h-4 bg-dark-700/50 rounded w-3/4 mb-2"/><div className="h-3 bg-dark-700/50 rounded w-1/2"/></td>
                    <td className="px-5 py-4"><div className="h-4 bg-dark-700/50 rounded w-full"/></td>
                    <td className="px-5 py-4"><div className="h-6 bg-dark-700/50 rounded-full w-24"/></td>
                    <td className="px-5 py-4"><div className="h-4 bg-dark-700/50 rounded w-20"/></td>
                    <td className="px-5 py-4"><div className="h-4 bg-dark-700/50 rounded w-24"/></td>
                    <td className="px-5 py-4"><div className="h-8 bg-dark-700/50 rounded w-8 ml-auto"/></td>
                  </tr>
                ))
              ) : contracts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-dark-400">
                    Nenhum contrato encontrado.
                  </td>
                </tr>
              ) : (
                contracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-dark-800/30 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="font-medium text-dark-100 mb-0.5">{contract.title}</div>
                      <div className="text-xs text-dark-400 font-mono">{contract.number}</div>
                    </td>
                    <td className="px-5 py-4 text-sm text-dark-200">
                      {contract.contact_name}
                    </td>
                    <td className="px-5 py-4">
                      {getStatusBadge(contract.status)}
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-dark-100">
                      R$ {contract.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-sm text-dark-200 bg-dark-800/50 px-2.5 py-1 rounded inline-flex items-center gap-2 border border-dark-700/50">
                        {format(new Date(contract.start_date), 'dd/MM/yyyy')}
                        <span className="text-dark-500">→</span>
                        {format(new Date(contract.end_date), 'dd/MM/yyyy')}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-1.5 text-dark-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors" title="Baixar PDF">
                          <Download size={18} />
                        </button>
                        <button className="p-1.5 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors" title="Mais opções">
                          <MoreVertical size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
