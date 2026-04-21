import { Globe } from 'lucide-react';

export default function () {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-500/10 flex items-center justify-center">
              <Globe size={20} className="text-primary-400" />
            </div>
            Landing Pages
          </h1>
          <p className="page-subtitle">Criador de páginas</p>
        </div>
      </div>

      <div className="glass-card p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center mb-4">
          <Globe size={32} className="text-primary-400" />
        </div>
        <h3 className="text-lg font-semibold text-dark-100 mb-2">Landing Pages</h3>
        <p className="text-dark-400 text-sm max-w-sm">
          Este módulo está em desenvolvimento. Em breve você terá acesso completo a todas as funcionalidades de Criador de páginas.
        </p>
        <div className="flex items-center gap-2 mt-4 px-3 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20">
          <div className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-pulse" />
          <span className="text-xs text-primary-300 font-medium">Em desenvolvimento</span>
        </div>
      </div>
    </div>
  );
}
