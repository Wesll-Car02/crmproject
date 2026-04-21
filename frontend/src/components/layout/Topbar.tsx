import { useLocation } from 'react-router-dom';
import { Bell, Search, Plus, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Visão geral da sua operação' },
  '/leads': { title: 'Leads', subtitle: 'Gerencie seus contatos e prospecções' },
  '/opportunities': { title: 'Oportunidades', subtitle: 'Pipeline de vendas' },
  '/proposals': { title: 'Propostas', subtitle: 'Gerencie suas propostas comerciais' },
  '/contracts': { title: 'Contratos', subtitle: 'Gestão de contratos' },
  '/cpq': { title: 'Produtos & Cotações', subtitle: 'Catálogo e configurador de preços' },
  '/cadence': { title: 'Cadências', subtitle: 'Sequências de prospecção automáticas' },
  '/financial': { title: 'Financeiro', subtitle: 'Boletos, cobranças e comissões' },
  '/chat': { title: 'Chat Unificado', subtitle: 'WhatsApp, Instagram e Email centralizados' },
  '/campaigns': { title: 'Campanhas', subtitle: 'Marketing multicanal' },
  '/automations': { title: 'Automações', subtitle: 'Fluxos e workflows automatizados' },
  '/landing-pages': { title: 'Landing Pages', subtitle: 'Criador de páginas de captura' },
  '/scheduling': { title: 'Agenda', subtitle: 'Reuniões e compromissos' },
  '/customer-success': { title: 'Customer Success', subtitle: 'Pós-venda e saúde do cliente' },
  '/prospecting': { title: 'Prospecção B2B', subtitle: 'Encontre empresas pelo CNPJ' },
  '/analytics': { title: 'Analytics', subtitle: 'Relatórios e insights' },
  '/ai': { title: 'Assistente IA', subtitle: 'Inteligência artificial para vendas' },
  '/tags': { title: 'Tags', subtitle: 'Gerencie suas etiquetas' },
  '/settings': { title: 'Configurações', subtitle: 'Personalize a plataforma' },
  '/admin': { title: 'Administração', subtitle: 'Gestão de usuários e plataforma' },
};

export default function Topbar() {
  const location = useLocation();
  const { user } = useAuthStore();
  const [searchFocused, setSearchFocused] = useState(false);

  const page = pageTitles[location.pathname] || { title: 'CRM Pro', subtitle: '' };

  return (
    <header className="flex items-center gap-4 px-6 py-3.5 bg-dark-900/60 backdrop-blur-sm border-b border-dark-800/60 flex-shrink-0">
      {/* Page Title */}
      <div className="flex-1">
        <h1 className="text-lg font-semibold text-dark-50">{page.title}</h1>
        <p className="text-xs text-dark-500">{page.subtitle}</p>
      </div>

      {/* Global Search */}
      <div className={`relative flex items-center transition-all duration-300 ${searchFocused ? 'w-80' : 'w-56'}`}>
        <Search size={14} className="absolute left-3 text-dark-500" />
        <input
          type="text"
          placeholder="Buscar leads, oportunidades..."
          className="input pl-9 py-2 text-xs w-full"
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
        <kbd className="absolute right-2 hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] text-dark-500 bg-dark-700 rounded border border-dark-600">
          ⌘K
        </kbd>
      </div>

      {/* Quick Add */}
      <button className="btn-primary btn-sm gap-1.5">
        <Plus size={14} />
        <span className="hidden sm:inline">Novo</span>
      </button>

      {/* Notifications */}
      <button className="btn-icon btn-ghost relative">
        <Bell size={18} />
        <span className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full ring-2 ring-dark-900" />
      </button>

      {/* User Avatar */}
      <div className="flex items-center gap-2.5 pl-3 border-l border-dark-800">
        <div className="w-8 h-8 rounded-full bg-primary-600/20 border border-primary-500/30 flex items-center justify-center text-primary-300 text-xs font-semibold cursor-pointer hover:border-primary-400 transition-all">
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
        <div className="hidden md:block">
          <p className="text-xs font-medium text-dark-200">{user?.firstName}</p>
          <p className="text-[10px] text-dark-500 capitalize">{user?.role?.replace('_', ' ')}</p>
        </div>
      </div>
    </header>
  );
}
