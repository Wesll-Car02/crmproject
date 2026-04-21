import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon, Clock, Link as LinkIcon, Plus, Video,
  CalendarCheck, Users, ChevronLeft, ChevronRight, X, Check,
  Mail, FileText, Phone, Briefcase, Bell, MessageSquare, Sliders
} from 'lucide-react';
import {
  format, addDays, addMonths, subMonths, startOfWeek, startOfMonth,
  endOfMonth, isSameDay, isSameMonth, startOfDay, endOfDay,
  addWeeks, subWeeks, parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../lib/api';

type ViewMode = 'day' | 'week' | 'month' | 'custom';

const TASK_TYPES = [
  { id: 'email', label: 'Envio de E-mail', icon: <Mail size={16} />, color: '#3b82f6' },
  { id: 'proposta', label: 'Envio de Proposta', icon: <FileText size={16} />, color: '#8b5cf6' },
  { id: 'ligacao', label: 'Ligação', icon: <Phone size={16} />, color: '#10b981' },
  { id: 'reuniao', label: 'Reunião', icon: <Briefcase size={16} />, color: '#f59e0b' },
  { id: 'compromisso', label: 'Compromisso', icon: <Bell size={16} />, color: '#ef4444' },
  { id: 'feedback', label: 'Feedback', icon: <MessageSquare size={16} />, color: '#ec4899' },
  { id: 'personalizado', label: 'Personalizado', icon: <Sliders size={16} />, color: '#6b7280' },
];

const TYPE_COLORS: Record<string, string> = Object.fromEntries(TASK_TYPES.map(t => [t.id, t.color]));
const TYPE_LABELS: Record<string, string> = Object.fromEntries(TASK_TYPES.map(t => [t.id, t.label]));

// ─── New Event Modal ─────────────────────────────────────────────────────────

function NewEventModal({ open, onClose, initialDate }: { open: boolean; onClose: () => void; initialDate: Date }) {
  const [form, setForm] = useState({
    title: '', type: 'reuniao', startTime: format(initialDate, "yyyy-MM-dd'T'HH:mm"),
    endTime: format(addDays(initialDate, 0), "yyyy-MM-dd'T'HH:mm").replace(/T\d{2}:\d{2}$/, 'T' + String(initialDate.getHours() + 1).padStart(2, '0') + ':00'),
    description: '', leadId: '',
  });
  const [mode, setMode] = useState<'event' | 'task'>('event');
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  const selectedType = TASK_TYPES.find(t => t.id === form.type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Título é obrigatório'); return; }
    setLoading(true);
    try {
      if (mode === 'task') {
        await api.post('/scheduling/tasks', {
          type: form.type, title: form.title,
          description: form.description, dueDate: form.startTime,
          leadId: form.leadId || undefined,
        });
        toast.success('Tarefa criada!');
      } else {
        await api.post('/scheduling', {
          title: form.title, type: form.type,
          startTime: form.startTime, endTime: form.endTime, description: form.description,
        });
        toast.success('Evento criado!');
      }
      qc.invalidateQueries({ queryKey: ['schedules'] });
      qc.invalidateQueries({ queryKey: ['upcoming-tasks'] });
      onClose();
    } catch { /* handled */ } finally { setLoading(false); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-lg font-bold text-dark-100">Novo Evento</h2>
          <button onClick={onClose} className="text-dark-400 hover:text-white"><X size={20} /></button>
        </div>

        {/* Mode toggle */}
        <div className="flex bg-dark-800 rounded-lg p-1 mb-5 border border-dark-700">
          <button onClick={() => setMode('event')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${mode === 'event' ? 'bg-dark-700 text-white' : 'text-dark-400'}`}>
            Evento no Calendário
          </button>
          <button onClick={() => setMode('task')}
            className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${mode === 'task' ? 'bg-dark-700 text-white' : 'text-dark-400'}`}>
            Tarefa de Lead
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task Type */}
          <div>
            <label className="text-xs text-dark-400 font-medium mb-2 block">Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {TASK_TYPES.map(tt => (
                <button key={tt.id} type="button" onClick={() => setForm(f => ({ ...f, type: tt.id }))}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${form.type === tt.id ? 'border-opacity-60' : 'border-dark-700 text-dark-400 bg-dark-800/50'}`}
                  style={form.type === tt.id ? { borderColor: tt.color + '66', backgroundColor: tt.color + '1a', color: tt.color } : {}}>
                  {tt.icon} {tt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-dark-400 font-medium mb-1 block">Título *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              placeholder="Título do evento" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-dark-400 font-medium mb-1 block">{mode === 'task' ? 'Data de vencimento' : 'Início'}</label>
              <input type="datetime-local" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-cyan-500" />
            </div>
            {mode === 'event' && (
              <div>
                <label className="text-xs text-dark-400 font-medium mb-1 block">Fim</label>
                <input type="datetime-local" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))}
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-cyan-500" />
              </div>
            )}
          </div>

          <div>
            <label className="text-xs text-dark-400 font-medium mb-1 block">Descrição</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={2} className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-cyan-500 resize-none"
              placeholder="Notas..." />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-dark-700 text-dark-300 text-sm hover:bg-dark-800">Cancelar</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium text-sm disabled:opacity-50">
              {loading ? 'Criando...' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Calendar Integration Panel ──────────────────────────────────────────────

function CalendarIntegrations() {
  const { data: integrations = [] } = useQuery({
    queryKey: ['calendar-integrations'],
    queryFn: () => api.get('/scheduling/integrations').then(r => r.data),
  });
  const qc = useQueryClient();

  const isConnected = (provider: string) => (integrations as any[]).some(i => i.provider === provider);

  const syncCalendar = async (provider: string) => {
    try {
      await api.post(`/scheduling/sync/${provider}`);
      toast.success(`Sincronização com ${provider} iniciada`);
      // Atualizar eventos após sincronização
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ['schedules'] });
      }, 2000);
    } catch {
      toast.error(`Erro ao sincronizar com ${provider}`);
    }
  };

  const connect = async (provider: string) => {
    try {
      const { data } = await api.get(`/scheduling/auth/${provider}`);
      if (data.url) window.location.href = data.url;
    } catch { toast.error('Erro ao iniciar autenticação'); }
  };

  const disconnect = async (provider: string) => {
    try {
      await api.delete(`/scheduling/integrations/${provider}`);
      qc.invalidateQueries({ queryKey: ['calendar-integrations'] });
      toast.success('Desconectado');
    } catch { /* handled */ }
  };

  return (
    <div className="glass-card p-5 border border-white/5">
      <h3 className="font-semibold text-dark-100 flex items-center gap-2 mb-4">
        <CalendarCheck size={16} className="text-cyan-500" /> Integrações
      </h3>
      <div className="space-y-3">
        {/* Google */}
        <div className="p-3 bg-dark-800/50 rounded-lg border border-dark-700/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-white flex items-center justify-center">
                <span className="text-[10px] font-bold text-blue-600">G</span>
              </div>
              <span className="text-sm font-medium text-dark-100">Google Calendar</span>
            </div>
            {isConnected('google') && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
          </div>
          {isConnected('google') ? (
            <div className="flex gap-2">
              <button onClick={() => syncCalendar('google')}
                className="flex-1 text-xs py-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                Sincronizar
              </button>
              <button onClick={() => disconnect('google')}
                className="flex-1 text-xs py-1.5 rounded border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition-colors">
                Desconectar
              </button>
            </div>
          ) : (
            <button onClick={() => connect('google')}
              className="w-full text-xs py-1.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-colors">
              Conectar Google Calendar
            </button>
          )}
        </div>

        {/* Microsoft */}
        <div className="p-3 bg-dark-800/50 rounded-lg border border-dark-700/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">M</span>
              </div>
              <span className="text-sm font-medium text-dark-100">Microsoft / Outlook</span>
            </div>
            {isConnected('microsoft') && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
          </div>
          {isConnected('microsoft') ? (
            <div className="flex gap-2">
              <button onClick={() => syncCalendar('microsoft')}
                className="flex-1 text-xs py-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                Sincronizar
              </button>
              <button onClick={() => disconnect('microsoft')}
                className="flex-1 text-xs py-1.5 rounded border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 transition-colors">
                Desconectar
              </button>
            </div>
          ) : (
            <button onClick={() => connect('microsoft')}
              className="w-full text-xs py-1.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 transition-colors">
              Conectar Microsoft Calendar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Mini Calendar ───────────────────────────────────────────────────────────

function MiniCalendar({ selected, onSelect }: { selected: Date; onSelect: (d: Date) => void }) {
  const [viewMonth, setViewMonth] = useState(selected);
  const start = startOfMonth(viewMonth);
  const end = endOfMonth(viewMonth);
  const startDow = start.getDay();
  const days: (Date | null)[] = [...Array(startDow).fill(null)];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(new Date(d));

  return (
    <div className="glass-card p-5 border border-white/5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-dark-100 capitalize text-sm">{format(viewMonth, 'MMMM yyyy', { locale: ptBR })}</h3>
        <div className="flex gap-1">
          <button onClick={() => setViewMonth(subMonths(viewMonth, 1))} className="p-1 text-dark-400 hover:text-white rounded hover:bg-dark-700"><ChevronLeft size={14} /></button>
          <button onClick={() => setViewMonth(addMonths(viewMonth, 1))} className="p-1 text-dark-400 hover:text-white rounded hover:bg-dark-700"><ChevronRight size={14} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 text-dark-500 font-medium">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => <div key={i}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {days.map((d, i) => d === null ? <div key={i} /> : (
          <button key={i} onClick={() => onSelect(d)}
            className={`py-1.5 rounded-full transition-colors ${isSameDay(d, selected) ? 'bg-cyan-500 text-white font-bold' : isSameDay(d, new Date()) ? 'bg-dark-700 text-cyan-400 font-semibold' : 'text-dark-300 hover:bg-dark-700 cursor-pointer'}`}>
            {format(d, 'd')}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Event block helpers ──────────────────────────────────────────────────────

function eventColor(event: any): string {
  return event.color || TYPE_COLORS[event.type] || '#6366f1';
}

function EventBlock({ event }: { event: any }) {
  const color = eventColor(event);
  const isTask = event.type && !event.start_time;

  return (
    <div className="rounded-lg p-2 mb-1 cursor-pointer text-xs border-l-4 transition-all hover:brightness-110 group relative"
      style={{ backgroundColor: color + '18', borderColor: color, borderLeftWidth: 3 }}>
      <div className="font-medium truncate" style={{ color }}>{event.title}</div>
      {event.start_time && (
        <div className="text-dark-500 mt-0.5">
          {format(parseISO(event.start_time), 'HH:mm')} – {event.end_time ? format(parseISO(event.end_time), 'HH:mm') : ''}
        </div>
      )}
      {isTask && event.lead_name && (
        <div className="text-dark-500 mt-0.5 flex items-center gap-1">
          <Users size={10} /> {event.lead_name}
        </div>
      )}
      <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {event.type && (
          <div className="text-[9px] px-1 py-0.5 rounded bg-dark-800/80 text-dark-300">
            {TYPE_LABELS[event.type] || event.type}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SchedulingPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [customFrom, setCustomFrom] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [customTo, setCustomTo] = useState(format(addDays(new Date(), 6), 'yyyy-MM-dd'));
  const [showNewEvent, setShowNewEvent] = useState(false);

  // Compute date range
  const { dateFrom, dateTo, displayDays } = useMemo(() => {
    if (viewMode === 'day') {
      return { dateFrom: startOfDay(currentDate), dateTo: endOfDay(currentDate), displayDays: [currentDate] };
    }
    if (viewMode === 'week') {
      const ws = startOfWeek(currentDate, { weekStartsOn: 0 });
      const days = Array.from({ length: 7 }, (_, i) => addDays(ws, i));
      return { dateFrom: startOfDay(days[0]), dateTo: endOfDay(days[6]), displayDays: days };
    }
    if (viewMode === 'month') {
      const ms = startOfMonth(currentDate);
      const me = endOfMonth(currentDate);
      return { dateFrom: ms, dateTo: me, displayDays: [] };
    }
    // custom
    const from = new Date(customFrom);
    const to = new Date(customTo);
    const days: Date[] = [];
    for (let d = new Date(from); d <= to; d = addDays(d, 1)) days.push(new Date(d));
    return { dateFrom: from, dateTo: to, displayDays: days };
  }, [viewMode, currentDate, customFrom, customTo]);

  const { data: events = [] } = useQuery({
    queryKey: ['schedules', dateFrom.toISOString(), dateTo.toISOString()],
    queryFn: () => api.get('/scheduling', { params: { dateFrom: dateFrom.toISOString(), dateTo: dateTo.toISOString() } }).then(r => r.data),
  });

  const { data: upcomingTasks = [] } = useQuery({
    queryKey: ['upcoming-tasks'],
    queryFn: () => api.get('/scheduling/tasks/upcoming').then(r => r.data),
  });

  const eventsArr: any[] = Array.isArray(events) ? events : [];
  const tasksArr: any[] = Array.isArray(upcomingTasks) ? upcomingTasks : [];

  // Combinar eventos e tarefas para exibição no calendário
  const allCalendarItems = useMemo(() => {
    const calendarEvents = [...eventsArr];

    // Converter tarefas em eventos do calendário
    tasksArr.forEach(task => {
      if (task.due_date) {
        const startDate = new Date(task.due_date);
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hora

        calendarEvents.push({
          id: `task-${task.id}`,
          title: task.title,
          description: task.description || `Tarefa com ${task.lead_name || 'lead'}`,
          start_time: startDate.toISOString(),
          end_time: endDate.toISOString(),
          type: task.type || 'email',
          isTask: true,
          taskId: task.id,
          leadId: task.lead_id,
          leadName: task.lead_name,
          color: TYPE_COLORS[task.type] || '#6366f1'
        });
      }
    });

    return calendarEvents;
  }, [eventsArr, tasksArr]);

  const navigate = (dir: 'prev' | 'next') => {
    if (viewMode === 'day') setCurrentDate(d => addDays(d, dir === 'next' ? 1 : -1));
    else if (viewMode === 'week') setCurrentDate(d => addWeeks(d, dir === 'next' ? 1 : -1));
    else if (viewMode === 'month') setCurrentDate(d => dir === 'next' ? addMonths(d, 1) : subMonths(d, 1));
  };

  const copyPublicLink = async () => {
    try {
      // Buscar o slug público do usuário atual
      const response = await api.get('/auth/me');
      const user = response.data;

      // Criar um slug a partir do nome do usuário (em produção, isso viria do backend)
      const userSlug = user.id || 'me'; // Usar ID ou gerar slug do nome
      const url = `${window.location.origin}/book/${encodeURIComponent(userSlug)}`;

      await navigator.clipboard.writeText(url);
      toast.success('Link público copiado! Compartilhe este link para permitir agendamentos.');
    } catch (error) {
      console.error('Erro ao copiar link:', error);
      toast.error('Não foi possível copiar o link. Tente novamente.');
    }
  };

  const generateBookingPage = async () => {
    try {
      const { data } = await api.post('/scheduling/booking-page');
      if (data.url) {
        navigator.clipboard.writeText(data.url).then(() => toast.success('Link da página de agendamento copiado!'));
      }
    } catch {
      toast.error('Erro ao gerar página de agendamento');
    }
  };

  // Month view grid
  const monthDays = useMemo(() => {
    if (viewMode !== 'month') return [];
    const ms = startOfMonth(currentDate);
    const me = endOfMonth(currentDate);
    const startDow = ms.getDay();
    const result: (Date | null)[] = [...Array(startDow).fill(null)];
    for (let d = new Date(ms); d <= me; d = addDays(d, 1)) result.push(new Date(d));
    while (result.length % 7 !== 0) result.push(null);
    return result;
  }, [viewMode, currentDate]);

  const getEventsForDay = (day: Date) =>
    allCalendarItems.filter(e => e.start_time && isSameDay(parseISO(e.start_time), day));

  const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 to 20:00

  const getEventTop = (event: any) => {
    if (!event.start_time) return 0;
    const d = parseISO(event.start_time);
    return ((d.getHours() - 7) * 60 + d.getMinutes()) * (80 / 60);
  };

  const getEventHeight = (event: any) => {
    if (!event.start_time || !event.end_time) return 40;
    const start = parseISO(event.start_time);
    const end = parseISO(event.end_time);
    const mins = (end.getTime() - start.getTime()) / 60000;
    return Math.max(mins * (80 / 60), 30);
  };

  return (
    <div className="space-y-6 animate-fade-in relative z-10 w-full">
      <NewEventModal open={showNewEvent} onClose={() => setShowNewEvent(false)} initialDate={currentDate} />

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <CalendarIcon size={20} className="text-white" />
            </div>
            Agenda
          </h1>
          <p className="text-dark-400 mt-1 text-sm">Gerencie eventos, tarefas e integre com Google/Microsoft Calendar.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <button onClick={copyPublicLink}
              className="flex items-center gap-2 px-4 py-2 bg-dark-800 border border-dark-700 hover:bg-dark-700 text-cyan-400 rounded-lg font-medium transition-all text-sm hover:border-cyan-500/30">
              <LinkIcon size={16} /> Copiar Link Público
            </button>
            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-64 p-2 bg-dark-900 border border-dark-700 rounded-lg shadow-lg text-xs text-dark-300 z-50">
              Compartilhe este link para clientes agendarem reuniões diretamente na sua agenda
            </div>
          </div>
          <button onClick={generateBookingPage}
            className="flex items-center gap-2 px-4 py-2 bg-dark-800 border border-dark-700 hover:bg-dark-700 text-emerald-400 rounded-lg font-medium transition-all text-sm hover:border-emerald-500/30">
            <CalendarCheck size={16} /> Página de Agendamento
          </button>
          <button onClick={() => setShowNewEvent(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-cyan-500/25 hover:-translate-y-0.5">
            <Plus size={18} /> Novo Evento
          </button>
        </div>
      </div>

      {/* VIEW SELECTOR + NAV */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="bg-dark-800 p-1 rounded-lg border border-dark-700 flex items-center gap-1">
            {(['day', 'week', 'month', 'custom'] as ViewMode[]).map(v => (
              <button key={v} onClick={() => setViewMode(v)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === v ? 'bg-dark-700 text-white shadow-sm' : 'text-dark-400 hover:text-dark-200'}`}>
                {v === 'day' ? 'Dia' : v === 'week' ? 'Semana' : v === 'month' ? 'Mês' : 'Personalizado'}
              </button>
            ))}
          </div>

          {viewMode !== 'custom' && (
            <div className="flex items-center gap-1">
              <button onClick={() => navigate('prev')} className="p-2 text-dark-400 hover:text-white rounded-lg hover:bg-dark-800 border border-transparent hover:border-dark-700 transition-all"><ChevronLeft size={16} /></button>
              <button onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1.5 text-sm text-dark-300 hover:text-white hover:bg-dark-800 rounded-lg border border-dark-700/50 transition-all">Hoje</button>
              <button onClick={() => navigate('next')} className="p-2 text-dark-400 hover:text-white rounded-lg hover:bg-dark-800 border border-transparent hover:border-dark-700 transition-all"><ChevronRight size={16} /></button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {viewMode === 'custom' ? (
            <div className="flex items-center gap-2">
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-1.5 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-cyan-500" />
              <span className="text-dark-500 text-sm">até</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="bg-dark-800 border border-dark-700 rounded-lg px-3 py-1.5 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-cyan-500" />
            </div>
          ) : (
            <span className="text-dark-300 font-medium capitalize text-sm">
              {viewMode === 'day' && format(currentDate, 'EEEE, d MMMM yyyy', { locale: ptBR })}
              {viewMode === 'week' && `${format(displayDays[0], 'd MMM', { locale: ptBR })} – ${format(displayDays[6], 'd MMM yyyy', { locale: ptBR })}`}
              {viewMode === 'month' && format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* SIDEBAR */}
        <div className="xl:col-span-1 space-y-6">
          <MiniCalendar selected={currentDate} onSelect={d => { setCurrentDate(d); setViewMode('day'); }} />
          <CalendarIntegrations />

          {/* Upcoming Tasks */}
          <div className="glass-card p-5 border border-white/5">
            <h3 className="font-semibold text-dark-100 flex items-center gap-2 mb-4">
              <Clock size={16} className="text-cyan-500" /> Próximas Tarefas
            </h3>
            <div className="space-y-2">
              {tasksArr.length === 0 && <p className="text-xs text-dark-500 text-center py-4">Nenhuma tarefa pendente</p>}
              {tasksArr.slice(0, 8).map((task: any) => {
                const color = TYPE_COLORS[task.type] || '#6366f1';
                return (
                  <div key={task.id} className="p-2.5 bg-dark-800/50 rounded-lg border border-dark-700/50 group">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: color }} />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-dark-100 truncate">{task.title}</div>
                        <div className="text-xs text-dark-500 mt-0.5">{TYPE_LABELS[task.type] || task.type}</div>
                        {task.due_date && <div className="text-xs text-dark-600 mt-0.5">{new Date(task.due_date).toLocaleDateString('pt-BR')}</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* MAIN CALENDAR VIEW */}
        <div className="xl:col-span-3">
          <div className="glass-card border border-white/5 overflow-hidden">

            {/* DAY VIEW */}
            {viewMode === 'day' && (
              <div className="flex flex-col">
                <div className="p-4 border-b border-dark-700/50 text-center">
                  <div className="text-sm font-medium text-dark-400 capitalize">{format(currentDate, 'EEEE', { locale: ptBR })}</div>
                  <div className={`text-3xl font-bold mt-0.5 ${isSameDay(currentDate, new Date()) ? 'text-cyan-400' : 'text-dark-100'}`}>{format(currentDate, 'd')}</div>
                </div>
                <div className="flex overflow-y-auto" style={{ maxHeight: 600 }}>
                  <div className="w-14 flex-shrink-0 border-r border-dark-700/30">
                    {HOURS.map(h => (
                      <div key={h} className="h-20 border-b border-dark-700/20 relative">
                        <span className="text-[10px] text-dark-600 absolute -top-2 right-1">{h}:00</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 relative">
                    {HOURS.map(h => <div key={h} className="h-20 border-b border-dark-700/20 hover:bg-dark-800/20 transition-colors" />)}
                    {getEventsForDay(currentDate).map(ev => (
                      <div key={ev.id} className="absolute left-1 right-1 rounded-lg px-2 py-1 overflow-hidden border-l-4"
                        style={{ top: getEventTop(ev), height: getEventHeight(ev), backgroundColor: eventColor(ev) + '18', borderColor: eventColor(ev) }}>
                        <div className="text-xs font-semibold truncate" style={{ color: eventColor(ev) }}>{ev.title}</div>
                        {ev.start_time && <div className="text-xs text-dark-500">{format(parseISO(ev.start_time), 'HH:mm')}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* WEEK VIEW */}
            {(viewMode === 'week' || viewMode === 'custom') && (
              <div className="flex flex-col">
                <div className="flex border-b border-dark-700/50 bg-dark-800/40">
                  <div className="w-14 flex-shrink-0 border-r border-dark-700/50" />
                  {displayDays.map((day, i) => (
                    <div key={i} className="flex-1 py-3 text-center border-r border-dark-700/50 last:border-0 min-w-0">
                      <div className="text-[10px] text-dark-500 font-medium uppercase">{format(day, 'EEE', { locale: ptBR })}</div>
                      <div className={`text-lg font-semibold mt-0.5 ${isSameDay(day, new Date()) ? 'text-cyan-400' : 'text-dark-100'}`}>
                        {format(day, 'd')}
                      </div>
                      {!isSameMonth(day, currentDate) && <div className="text-[9px] text-dark-600">{format(day, 'MMM', { locale: ptBR })}</div>}
                    </div>
                  ))}
                </div>
                <div className="flex overflow-y-auto" style={{ maxHeight: 580 }}>
                  <div className="w-14 flex-shrink-0 border-r border-dark-700/30">
                    {HOURS.map(h => (
                      <div key={h} className="h-20 border-b border-dark-700/20 relative">
                        <span className="text-[10px] text-dark-600 absolute -top-2 right-1">{h}:00</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex-1 flex">
                    {displayDays.map((day, di) => (
                      <div key={di} className="flex-1 border-r border-dark-700/20 last:border-0 relative min-w-0">
                        {HOURS.map(h => <div key={h} className="h-20 border-b border-dark-700/10 hover:bg-dark-800/20 transition-colors cursor-pointer" onClick={() => { setCurrentDate(day); setShowNewEvent(true); }} />)}
                        {getEventsForDay(day).map(ev => (
                          <div key={ev.id} className="absolute left-0.5 right-0.5 rounded px-1 py-0.5 overflow-hidden border-l-2 cursor-pointer"
                            style={{ top: getEventTop(ev), height: Math.max(getEventHeight(ev), 24), backgroundColor: eventColor(ev) + '18', borderColor: eventColor(ev) }}>
                            <div className="text-[10px] font-semibold truncate leading-tight" style={{ color: eventColor(ev) }}>{ev.title}</div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* MONTH VIEW */}
            {viewMode === 'month' && (
              <div>
                <div className="grid grid-cols-7 border-b border-dark-700/50">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                    <div key={d} className="py-3 text-center text-xs font-medium text-dark-500 border-r border-dark-700/30 last:border-0">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {monthDays.map((day, i) => {
                    const dayEvents = day ? getEventsForDay(day) : [];
                    return (
                      <div key={i} className={`border-r border-b border-dark-700/20 last:border-r-0 min-h-[100px] p-1.5 ${!day ? 'bg-dark-900/30' : 'hover:bg-dark-800/20 transition-colors cursor-pointer'} ${day && isSameDay(day, new Date()) ? 'bg-cyan-500/5' : ''}`}
                        onClick={() => day && (() => { setCurrentDate(day); setViewMode('day'); })()}>
                        {day && (
                          <>
                            <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isSameDay(day, new Date()) ? 'bg-cyan-500 text-white' : !isSameMonth(day, currentDate) ? 'text-dark-600' : 'text-dark-300'}`}>
                              {format(day, 'd')}
                            </div>
                            <div className="space-y-0.5">
                              {dayEvents.slice(0, 3).map(ev => (
                                <div key={ev.id} className="text-[9px] px-1 py-0.5 rounded truncate font-medium"
                                  style={{ backgroundColor: eventColor(ev) + '22', color: eventColor(ev) }}>
                                  {ev.title}
                                </div>
                              ))}
                              {dayEvents.length > 3 && <div className="text-[9px] text-dark-500">+{dayEvents.length - 3} mais</div>}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
