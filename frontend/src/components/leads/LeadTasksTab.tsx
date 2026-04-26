import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, CheckCircle2, Clock, PhoneCall, Mail, Calendar, Users, FileText, MessageSquare, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import AddTaskModal from './AddTaskModal';
import { formatDate } from '../../utils/leadUtils';

interface LeadTasksTabProps {
  leadId: string;
  leadName: string;
}

const TASK_TYPE_LABELS: Record<string, string> = {
  email: 'E-mail',
  proposta: 'Proposta',
  ligacao: 'Ligação',
  reuniao: 'Reunião',
  compromisso: 'Compromisso',
  feedback: 'Feedback',
  personalizado: 'Personalizado',
};

const TASK_TYPE_ICONS: Record<string, JSX.Element> = {
  email: <Mail size={15} />,
  proposta: <FileText size={15} />,
  ligacao: <PhoneCall size={15} />,
  reuniao: <Users size={15} />,
  compromisso: <Calendar size={15} />,
  feedback: <Star size={15} />,
  personalizado: <MessageSquare size={15} />,
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-slate-400 bg-slate-400/10 border-slate-400/20',
  medium: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  high: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baixa', medium: 'Média', high: 'Alta',
};

export default function LeadTasksTab({ leadId, leadName }: LeadTasksTabProps) {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['lead-tasks', leadId],
    queryFn: () => api.get(`/scheduling/tasks/lead/${leadId}`).then(r => r.data),
    enabled: !!leadId,
  });

  const completeMutation = useMutation({
    mutationFn: (taskId: string) => api.patch(`/scheduling/tasks/${taskId}/complete`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-tasks', leadId] });
      queryClient.invalidateQueries({ queryKey: ['lead-activities', leadId] });
      toast.success('Tarefa concluída!');
    },
    onError: () => toast.error('Erro ao concluir tarefa'),
  });

  const filtered = tasks.filter((t: any) => {
    if (filter === 'pending') return !t.completed_at;
    if (filter === 'completed') return !!t.completed_at;
    return true;
  });

  const pending = tasks.filter((t: any) => !t.completed_at).length;
  const done = tasks.filter((t: any) => !!t.completed_at).length;

  if (isLoading) {
    return (
      <div className="flex justify-center p-10">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-dark-100">Tarefas</h3>
          <div className="flex gap-1 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">{pending} pendentes</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">{done} concluídas</span>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={15} /> Nova Tarefa
        </button>
      </div>

      <div className="flex gap-1 p-1 bg-dark-800/50 rounded-lg w-fit">
        {(['all', 'pending', 'completed'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${filter === f ? 'bg-dark-700 text-dark-100' : 'text-dark-500 hover:text-dark-300'}`}
          >
            {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendentes' : 'Concluídas'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-10 bg-dark-800/20 border border-dark-700/50 rounded-xl">
          <Clock size={32} className="mx-auto mb-2 text-dark-500 opacity-50" />
          <p className="text-dark-400">Nenhuma tarefa encontrada.</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-3 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            + Nova Tarefa
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task: any) => {
            const isCompleted = !!task.completed_at;
            const isOverdue = !isCompleted && task.due_date && new Date(task.due_date) < new Date();

            return (
              <div
                key={task.id}
                className={`p-4 rounded-xl border transition-all ${isCompleted
                  ? 'bg-dark-800/20 border-dark-700/30 opacity-60'
                  : isOverdue
                    ? 'bg-rose-500/5 border-rose-500/20'
                    : 'bg-dark-800/40 border-dark-700/50'
                  }`}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => !isCompleted && completeMutation.mutate(task.id)}
                    disabled={isCompleted || completeMutation.isPending}
                    className={`mt-0.5 flex-shrink-0 transition-colors ${isCompleted ? 'text-emerald-500 cursor-default' : 'text-dark-600 hover:text-emerald-400'}`}
                  >
                    <CheckCircle2 size={20} fill={isCompleted ? 'currentColor' : 'none'} />
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-medium text-sm ${isCompleted ? 'line-through text-dark-500' : 'text-dark-100'}`}>
                        {task.title}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium}`}>
                        {PRIORITY_LABELS[task.priority] || 'Média'}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded border border-dark-600 text-dark-400 bg-dark-700/30">
                        {TASK_TYPE_ICONS[task.type]} {TASK_TYPE_LABELS[task.type] || task.type}
                      </span>
                    </div>

                    {task.description && (
                      <p className="text-xs text-dark-400 mt-1">{task.description}</p>
                    )}

                    <div className="flex items-center gap-3 mt-2 text-xs">
                      {task.due_date && (
                        <span className={`flex items-center gap-1 ${isOverdue && !isCompleted ? 'text-rose-400' : 'text-dark-500'}`}>
                          <Calendar size={12} />
                          {isCompleted ? 'Concluída: ' : isOverdue ? 'Vencida: ' : ''}{formatDate(task.due_date).split(' ')[0]}
                        </span>
                      )}
                      {task.assigned_to_name && (
                        <span className="text-dark-500 flex items-center gap-1">
                          <Users size={12} /> {task.assigned_to_name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddTaskModal
        leadId={leadId}
        leadName={leadName}
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          queryClient.invalidateQueries({ queryKey: ['lead-tasks', leadId] });
        }}
      />
    </div>
  );
}
