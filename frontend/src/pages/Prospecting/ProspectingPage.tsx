import React, { useState } from 'react';
import {
  Search, Building2, MapPin, Phone, Mail, Globe, Users, Database,
  Plus, ChevronRight, Activity, ArrowUpRight, X, ChevronDown, ChevronUp
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../lib/api';

function formatCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function isCNPJ(value: string): boolean {
  return /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(value);
}

function CompanyDetailModal({ company, onClose, onAddLead }: { company: any; onClose: () => void; onAddLead: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-dark-100">{company.nomeFantasia || company.razaoSocial}</h2>
            <p className="text-sm text-dark-400 mt-0.5">{company.razaoSocial}</p>
          </div>
          <button onClick={onClose} className="text-dark-400 hover:text-white p-1"><X size={20} /></button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div className="space-y-3">
            <div><span className="text-dark-500 text-xs">CNPJ</span><p className="text-dark-100 font-mono">{company.cnpj}</p></div>
            <div><span className="text-dark-500 text-xs">Situação</span>
              <p className={`font-medium ${company.situacao?.toLowerCase().includes('ativa') ? 'text-emerald-400' : 'text-rose-400'}`}>{company.situacao}</p>
            </div>
            <div><span className="text-dark-500 text-xs">Abertura</span><p className="text-dark-100">{company.dataAbertura || '—'}</p></div>
            <div><span className="text-dark-500 text-xs">Porte</span><p className="text-dark-100">{company.porte}</p></div>
          </div>
          <div className="space-y-3">
            <div><span className="text-dark-500 text-xs">Capital Social</span><p className="text-dark-100">{company.capitalSocialFormatado}</p></div>
            <div><span className="text-dark-500 text-xs">Natureza Jurídica</span><p className="text-dark-100">{company.naturezaJuridica}</p></div>
            {company.telefone && <div><span className="text-dark-500 text-xs">Telefone</span><p className="text-dark-100">{company.telefone}</p></div>}
            {company.email && <div><span className="text-dark-500 text-xs">E-mail</span><p className="text-dark-100">{company.email}</p></div>}
          </div>
        </div>

        <div className="mb-4">
          <span className="text-dark-500 text-xs">Endereço</span>
          <p className="text-dark-100 text-sm mt-0.5">{company.endereco}</p>
        </div>

        <div className="mb-4">
          <span className="text-dark-500 text-xs">CNAE Principal</span>
          <p className="text-dark-100 text-sm mt-0.5">{company.cnae}</p>
        </div>

        {company.cnaeSecundarios?.length > 0 && (
          <div className="mb-4">
            <span className="text-dark-500 text-xs">CNAEs Secundários</span>
            <ul className="mt-1 space-y-0.5">
              {company.cnaeSecundarios.slice(0, 5).map((c: string, i: number) => (
                <li key={i} className="text-xs text-dark-300">{c}</li>
              ))}
            </ul>
          </div>
        )}

        {company.qsa?.length > 0 && (
          <div className="mb-4">
            <span className="text-dark-500 text-xs">Quadro Societário</span>
            <ul className="mt-1 space-y-1">
              {company.qsa.map((s: any, i: number) => (
                <li key={i} className="text-sm text-dark-200">
                  {s.nome} <span className="text-dark-500 text-xs">— {s.qualificacao}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-dark-700 text-dark-300 hover:bg-dark-800 rounded-lg text-sm">Fechar</button>
          <button onClick={onAddLead}
            className="flex-1 py-2.5 bg-fuchsia-500 hover:bg-fuchsia-400 text-white font-medium rounded-lg text-sm flex items-center justify-center gap-2">
            <Plus size={16} /> Adicionar como Lead
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProspectingPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [detailCompany, setDetailCompany] = useState<any>(null);
  const [addingLeadId, setAddingLeadId] = useState<string | null>(null);

  const { data: recentSearches = [] } = useQuery({
    queryKey: ['recent-searches'],
    queryFn: () => api.get('/prospecting/recent').then(r => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['prospecting-stats'],
    queryFn: () => api.get('/prospecting/stats').then(r => r.data),
  });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    // Validação de CNPJ
    const cleanCNPJ = q.replace(/\D/g, '');
    if (cleanCNPJ.length !== 14) {
      toast.error('CNPJ deve ter exatamente 14 dígitos');
      return;
    }

    setIsSearching(true);
    setResults([]);
    setSubmittedQuery(q);

    try {
      const endpoint = `/prospecting/cnpj/${cleanCNPJ}`;
      const { data } = await api.get(endpoint);

      if (Array.isArray(data)) {
        setResults(data.slice(0, 10)); // Limitar a 10 resultados
      } else {
        setResults([data]);
      }

      if ((Array.isArray(data) && data.length === 0) || (!Array.isArray(data) && !data.cnpj)) {
        toast.error('Nenhum resultado encontrado');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Erro na consulta. Tente novamente.';
      toast.error(msg);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddAsLead = async (company: any) => {
    setAddingLeadId(company.cnpjRaw);
    try {
      await api.post('/prospecting/add-lead', company);
      toast.success(`${company.nomeFantasia || company.razaoSocial} adicionado como lead!`);
      if (detailCompany) setDetailCompany(null);
    } catch { /* handled by interceptor */ } finally { setAddingLeadId(null); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = raw.replace(/\D/g, '');
    if (digits.length <= 14 && /^\d*$/.test(digits)) {
      setSearchQuery(formatCNPJ(raw));
    } else {
      setSearchQuery(raw);
    }
  };

  const useRecent = (q: string) => {
    setSearchQuery(q);
  };

  return (
    <div className="space-y-6 animate-fade-in relative z-10 w-full pb-10">
      {detailCompany && (
        <CompanyDetailModal
          company={detailCompany}
          onClose={() => setDetailCompany(null)}
          onAddLead={() => handleAddAsLead(detailCompany)}
        />
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500 to-pink-600 flex items-center justify-center shadow-lg shadow-fuchsia-500/20">
              <Database size={20} className="text-white" />
            </div>
            Enriquecimento B2B
          </h1>
          <p className="text-dark-400 mt-1 text-sm">Pesquise CNPJs e encontre empresas para prospecção ativa. Crie Leads com um clique.</p>
        </div>

        <div className="py-2 px-4 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-xl flex items-center gap-3 text-sm font-medium">
          <Activity size={16} className="text-fuchsia-400" />
          <span className="text-dark-200">Fonte: BrasilAPI (Receita Federal)</span>
          <span className="text-emerald-400 text-xs font-semibold px-2 py-0.5 bg-emerald-500/10 rounded border border-emerald-500/20">Gratuito</span>
        </div>
      </div>

      {/* STATS CARDS */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card p-5 border border-white/5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-fuchsia-500/10 text-fuchsia-400 flex items-center justify-center">
                <Database size={16} />
              </div>
              <div>
                <div className="text-sm text-dark-400">Consultas Hoje</div>
                <div className="text-2xl font-bold text-dark-100">{stats.todaySearches || 0}</div>
              </div>
            </div>
          </div>
          <div className="glass-card p-5 border border-white/5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Users size={16} />
              </div>
              <div>
                <div className="text-sm text-dark-400">Leads Criados</div>
                <div className="text-2xl font-bold text-dark-100">{stats.leadsCreated || 0}</div>
              </div>
            </div>
          </div>
          <div className="glass-card p-5 border border-white/5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Building2 size={16} />
              </div>
              <div>
                <div className="text-sm text-dark-400">Empresas Encontradas</div>
                <div className="text-2xl font-bold text-dark-100">{stats.companiesFound || 0}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SEARCH ENGINE */}
      <div className="glass-card p-6 border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-fuchsia-500 via-pink-500 to-rose-500" />
        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-fuchsia-500/5 blur-3xl rounded-full" />

        <div className="max-w-3xl mx-auto relative z-10">
          <h2 className="text-xl font-bold text-dark-100 text-center mb-2">Consultar CNPJ</h2>
          <p className="text-center text-dark-400 text-sm mb-6">Dados em tempo real da Receita Federal via BrasilAPI</p>


          <form onSubmit={handleSearch} className="relative group">
            <div className={`absolute inset-0 bg-gradient-to-r from-fuchsia-500 to-pink-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500 ${isSearching ? 'animate-pulse opacity-50' : ''}`} />
            <div className="relative flex items-center bg-dark-900 border border-dark-700 hover:border-dark-600 focus-within:border-fuchsia-500 rounded-2xl p-2 transition-all">
              <Search size={24} className={`ml-4 mr-2 flex-shrink-0 ${isSearching ? 'text-fuchsia-500 animate-bounce' : 'text-dark-400'}`} />
              <input
                type="text"
                placeholder="Digite o CNPJ (ex: 11.222.333/0001-81)..."
                className="flex-1 bg-transparent border-none text-dark-100 placeholder:text-dark-600 px-2 py-3 focus:outline-none text-lg"
                value={searchQuery}
                onChange={handleInputChange}
              />
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="bg-gradient-to-r from-fuchsia-500 to-pink-600 hover:from-fuchsia-400 hover:to-pink-500 text-white font-semibold py-3 px-8 rounded-xl transition-all shadow-lg shadow-fuchsia-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0"
              >
                {isSearching ? 'Consultando...' : <><span>Consultar</span><ArrowUpRight size={18} /></>}
              </button>
            </div>
          </form>

          {(recentSearches as any[]).length > 0 && (
            <div className="flex flex-wrap justify-center gap-3 mt-6">
              <span className="text-xs text-dark-500 font-medium self-center">Consultados recentemente:</span>
              {(recentSearches as any[]).slice(0, 5).map((s: any, i: number) => (
                <button key={i} onClick={() => useRecent(s.search_query)}
                  className="text-xs px-3 py-1 bg-dark-800 border border-dark-700 text-dark-300 rounded-full cursor-pointer hover:bg-dark-700 transition-colors">
                  {s.search_query}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RESULTS */}
      {results.length > 0 && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-dark-100">Resultado da Consulta</h3>
            <span className="text-sm text-dark-400">{results.length} empresa(s) encontrada(s)</span>
          </div>

          {results.map((company, i) => (
            <div key={i} className="glass-card p-5 border border-white/5 hover:border-fuchsia-500/30 transition-all group flex flex-col md:flex-row gap-6 items-start md:items-center">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h4 className="text-lg font-bold text-dark-100">{company.nomeFantasia || company.razaoSocial}</h4>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded border ${company.situacao?.toLowerCase().includes('ativa') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                    {company.situacao}
                  </span>
                  <span className="text-xs font-mono text-dark-400 bg-dark-800 px-2 py-0.5 rounded border border-dark-700">{company.cnpj}</span>
                </div>
                <div className="text-sm text-dark-300 mb-3">{company.razaoSocial}</div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-sm text-dark-400">
                  {company.endereco && (
                    <div className="flex items-start gap-2">
                      <MapPin size={14} className="text-fuchsia-500 mt-0.5 flex-shrink-0" />
                      <span className="truncate">{company.cidade}, {company.uf}</span>
                    </div>
                  )}
                  {company.cnae && (
                    <div className="flex items-start gap-2">
                      <Building2 size={14} className="text-fuchsia-500 mt-0.5 flex-shrink-0" />
                      <span className="truncate" title={company.cnae}>{company.cnae}</span>
                    </div>
                  )}
                  {company.capitalSocialFormatado && (
                    <div className="flex items-start gap-2">
                      <span className="text-fuchsia-500 mt-0.5 flex-shrink-0 text-xs font-bold">R$</span>
                      <span>Capital: {company.capitalSocialFormatado}</span>
                    </div>
                  )}
                  {company.porte && (
                    <div className="flex items-start gap-2">
                      <Users size={14} className="text-fuchsia-500 mt-0.5 flex-shrink-0" />
                      <span>{company.porte}</span>
                    </div>
                  )}
                  {company.telefone && (
                    <div className="flex items-start gap-2">
                      <Phone size={14} className="text-fuchsia-500 mt-0.5 flex-shrink-0" />
                      <span>{company.telefone}</span>
                    </div>
                  )}
                  {company.email && (
                    <div className="flex items-start gap-2">
                      <Mail size={14} className="text-fuchsia-500 mt-0.5 flex-shrink-0" />
                      <span className="truncate">{company.email}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full md:w-auto flex flex-col sm:flex-row md:flex-col gap-2 shrink-0 border-t md:border-t-0 md:border-l border-dark-700/50 pt-4 md:pt-0 md:pl-6">
                <button
                  onClick={() => handleAddAsLead(company)}
                  disabled={addingLeadId === company.cnpjRaw}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-fuchsia-500 hover:bg-fuchsia-400 disabled:opacity-50 text-white rounded-lg transition-colors font-medium text-sm flex-1"
                >
                  <Plus size={16} />
                  {addingLeadId === company.cnpjRaw ? 'Adicionando...' : 'Adicionar como Lead'}
                </button>
                <button
                  onClick={() => setDetailCompany(company)}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-dark-800 hover:bg-dark-700 border border-dark-700 text-dark-200 hover:text-white rounded-lg transition-colors text-sm flex-1"
                >
                  Ver Detalhes <ChevronRight size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* EMPTY STATE */}
      {!isSearching && submittedQuery && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-fuchsia-500/10 flex items-center justify-center mb-4">
            <Search size={32} className="text-fuchsia-400" />
          </div>
          <h3 className="text-lg font-semibold text-dark-100 mb-2">Nenhum resultado</h3>
          <p className="text-dark-400 text-sm max-w-sm">
            Não foi possível encontrar o CNPJ "{submittedQuery}". Verifique se o número está correto e tente novamente.
          </p>
        </div>
      )}
    </div>
  );
}
