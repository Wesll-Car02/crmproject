import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, Users, Target, FileText, FileSignature, Package,
  DollarSign, MessageSquare, Megaphone, Zap, Globe, Calendar,
  HeartHandshake, Search, BarChart3, Bot, Tag, Settings, Shield,
  ChevronLeft, ChevronRight, Building2, Phone, Mail, Instagram,
  TrendingUp, Layers, LogOut, User
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { clsx } from 'clsx';

const navGroups = [
  {
    label: 'Principal',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/chat', icon: MessageSquare, label: 'Chat Unificado', badge: '3' },
      { to: '/scheduling', icon: Calendar, label: 'Agenda' },
      { to: '/ai', icon: Bot, label: 'Assistente IA' },
    ],
  },
  {
    label: 'Comercial',
    items: [
      { to: '/prospecting', icon: Search, label: 'Prospecção B2B' },
      { to: '/leads', icon: Users, label: 'Leads' },
      { to: '/opportunities', icon: Target, label: 'Oportunidades' },
      { to: '/cpq', icon: Package, label: 'Produtos & Cotações' },
      { to: '/proposals', icon: FileText, label: 'Propostas' },
      { to: '/contracts', icon: FileSignature, label: 'Contratos' },
      { to: '/cadence', icon: Phone, label: 'Cadências SDR' },
    ],
  },
  {
    label: 'Marketing',
    items: [
      { to: '/campaigns', icon: Megaphone, label: 'Campanhas' },
      { to: '/landing-pages', icon: Globe, label: 'Landing Pages' },
      { to: '/automations', icon: Zap, label: 'Automações' },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { to: '/financial', icon: DollarSign, label: 'Financeiro' },
      { to: '/customer-success', icon: HeartHandshake, label: 'Customer Success' },
    ],
  },
  {
    label: 'Análises',
    items: [
      { to: '/analytics', icon: BarChart3, label: 'Analytics' },
      { to: '/tags', icon: Tag, label: 'Tags' },
    ],
  },
  {
    label: 'Administração',
    items: [
      { to: '/settings', icon: Settings, label: 'Configurações' },
      { to: '/admin', icon: Shield, label: 'Gestão da Plataforma', roles: ['super_admin', 'admin'] },
    ],
  },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout, hasRole } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      className={clsx(
        'flex flex-col h-full bg-dark-950 border-r border-dark-800/60 transition-all duration-300 flex-shrink-0',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-dark-800/60">
        <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-glow">
          <Layers className="w-4.5 h-4.5 text-white" size={18} />
        </div>
        {!collapsed && (
          <div className="animate-fade-in">
            <span className="text-gradient font-bold text-base">CRM Pro</span>
            <p className="text-dark-500 text-xs truncate max-w-[130px]">{user?.tenantName}</p>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto p-1 rounded-lg text-dark-500 hover:text-dark-200 hover:bg-dark-800 transition-all"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto no-scrollbar py-4 px-2 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-3 text-xs font-semibold text-dark-600 uppercase tracking-widest mb-1.5">
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items
                .filter((item: any) => !item.roles || item.roles.some((r: string) => hasRole(r)))
                .map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      clsx(
                        'sidebar-item relative group',
                        isActive && 'active',
                        collapsed && 'justify-center px-2'
                      )
                    }
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon size={18} className="flex-shrink-0" />
                    {!collapsed && (
                      <span className="flex-1 truncate">{item.label}</span>
                    )}
                    {!collapsed && 'badge' in item && item.badge && (
                      <span className="badge-danger text-[10px] px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                    {collapsed && 'badge' in item && item.badge && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                    )}
                    {/* Tooltip when collapsed */}
                    {collapsed && (
                      <div className="tooltip left-full ml-2 hidden group-hover:block">
                        {item.label}
                      </div>
                    )}
                  </NavLink>
                ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User Profile */}
      <div className="border-t border-dark-800/60 p-3">
        <div className={clsx('flex items-center gap-3', collapsed && 'justify-center')}>
          <div className="w-8 h-8 rounded-full bg-primary-600/20 border border-primary-500/30 flex items-center justify-center flex-shrink-0 text-primary-300 text-xs font-semibold">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0 animate-fade-in">
              <p className="text-sm font-medium text-dark-100 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-dark-500 truncate capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-dark-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
              title="Sair"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
