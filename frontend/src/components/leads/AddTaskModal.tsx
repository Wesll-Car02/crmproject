import React, { useState } from 'react';
import { X, Calendar, Clock, Flag, FileText, CheckSquare, Globe, RefreshCw } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { syncTaskWithCalendar } from '../../utils/leadUtils';

interface AddTaskModalProps {
  leadId: string;
  leadName: string;
  isOpen: boolean;
  onClose: () => void;
  existingTask?: any;
}

export default function AddTaskModal({
  leadId,
  leadName,
  isOpen,
  onClose,
  existingTask
}: AddTaskModalProps) {
  const [formData, setFormData] = useState({
    title: existingTask?.title || '',
    description: existingTask?.description || '',
    type: (existingTask?.type || 'email') as 'email' | 'proposta' | 'ligacao' | 'reuniao' | 'compromisso' | 'feedback' | 'personalizado',
    due_date: existingTask?.due_date ? new Date(existingTask.due_date).toISOString().split('T')[0] : '',
    due_time: existingTask?.due_date ? new Date(existingTask.due_date).toISOString().split('T')[1].substring(0, 5) : '09:00',
    priority: (existingTask?.priority || 'medium') as 'low' | 'medium' | 'high' | 'urgent',
    notes: existingTask?.notes || '',
    syncWithCalendar: false
  });

  const queryClient = useQueryClient();

  const addTaskMutation = useMutation({
    mutationFn: (taskData: any) =>
      existingTask
        ? api.put(`/scheduling/tasks/${existingTask.id}`, taskData)
        : api.post(`/scheduling/tasks`, {
            ...taskData,
            leadId: leadId,
            userId: taskData.userId || undefined // O backend usará o userId do usuário autenticado se não fornecido
          }),
    onSuccess: async (response) => {
      queryClient.invalidateQueries({ queryKey: ['lead-activities', leadId] });
      queryClient.invalidateQueries({ queryKey: ['scheduled-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['upcoming-tasks'] }); // Invalida a query da agenda

      const task = response.data;
      const successMessage = existingTask ? 'Tarefa atualizada com sucesso!' : 'Tarefa agendada com sucesso!';
      toast.success(successMessage);

      // Sincronizar com calendário se solicitado
      if (formData.syncWithCalendar && task.due_date) {
        const startDate = new Date(task.due_date);
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hora depois

        await syncTaskWithCalendar({
          title: task.title,
          description: task.description || `Tarefa com ${leadName}`,
          startDateTime: startDate.toISOString(),
          endDateTime: endDate.toISOString(),
          location: 'Reunião virtual'
        });
      }

      onClose();
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Erro ao agendar tarefa');
    }
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'email',
      due_date: '',
      due_time: '09:00',
      priority: 'medium',
      notes: '',
      syncWithCalendar: false
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    if (!formData.due_date) {
      toast.error('Data é obrigatória');
      return;
    }

    const dueDate = new Date(`${formData.due_date}T${formData.due_time}:00`);

    const taskData = {
      type: formData.type,
      title: formData.title.trim(),
      description: formData.description.trim() || `Tarefa com ${leadName}`,
      dueDate: dueDate.toISOString(),
      priority: formData.priority,
      notes: formData.notes || undefined
    };

    addTaskMutation.mutate(taskData);
  };

  const handleChange = (field: keyof typeof formData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Gerar data mínima (hoje)
  const today = new Date().toISOString().split('T')[0];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-dark-100 flex items-center gap-2">
            <CheckSquare size={20} /> {existingTask ? 'Editar Tarefa' : 'Agendar Tarefa'}
          </h2>
          <button onClick={onClose} className="text-dark-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Título */}
          <div>
            <label className="text-xs text-dark-400 font-medium mb-1 block">Título *</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => handleChange('title', e.target.value)}
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Ex: Ligar para cliente, Enviar proposta, etc."
              required
            />
          </div>

          {/* Descrição */}
          <div>
            <label className="text-xs text-dark-400 font-medium mb-1 block">Descrição</label>
            <textarea
              value={formData.description}
              onChange={e => handleChange('description', e.target.value)}
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[80px] resize-none"
              placeholder="Detalhes da tarefa..."
              rows={3}
            />
          </div>

          {/* Tipo e Prioridade */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-dark-400 font-medium mb-1 block">Tipo</label>
              <select
                value={formData.type}
                onChange={e => handleChange('type', e.target.value)}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="email">E-mail</option>
                <option value="proposta">Proposta</option>
                <option value="ligacao">Ligação</option>
                <option value="reuniao">Reunião</option>
                <option value="compromisso">Compromisso</option>
                <option value="feedback">Feedback</option>
                <option value="personalizado">Personalizado</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-dark-400 font-medium mb-1 flex items-center gap-1">
                <Flag size={12} /> Prioridade
              </label>
              <select
                value={formData.priority}
                onChange={e => handleChange('priority', e.target.value)}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="low">Baixa</option>
                <option value="medium">Média</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
          </div>

          {/* Data e Hora */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-dark-400 font-medium mb-1 flex items-center gap-1">
                <Calendar size={12} /> Data *
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={e => handleChange('due_date', e.target.value)}
                min={today}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="text-xs text-dark-400 font-medium mb-1 flex items-center gap-1">
                <Clock size={12} /> Hora
              </label>
              <input
                type="time"
                value={formData.due_time}
                onChange={e => handleChange('due_time', e.target.value)}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="text-xs text-dark-400 font-medium mb-1 flex items-center gap-1">
              <FileText size={12} /> Notas
            </label>
            <textarea
              value={formData.notes}
              onChange={e => handleChange('notes', e.target.value)}
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[60px] resize-none"
              placeholder="Observações adicionais..."
              rows={2}
            />
          </div>

          {/* Sincronizar com calendário */}
          <div className="flex items-center gap-2 p-3 bg-dark-800/50 rounded-lg border border-dark-700">
            <input
              type="checkbox"
              id="syncCalendar"
              checked={formData.syncWithCalendar}
              onChange={e => handleChange('syncWithCalendar', e.target.checked)}
              className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-indigo-500 focus:ring-indigo-500 focus:ring-2"
            />
            <label htmlFor="syncCalendar" className="text-sm text-dark-300 flex items-center gap-2 cursor-pointer">
              <Globe size={14} />
              Sincronizar com calendário (Google/Outlook)
            </label>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-dark-700 text-dark-300 hover:bg-dark-800 transition-colors text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={addTaskMutation.isPending}
              className="flex-1 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium text-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {addTaskMutation.isPending ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  {existingTask ? 'Atualizando...' : 'Agendando...'}
                </>
              ) : (
                <>
                  <CheckSquare size={14} />
                  {existingTask ? 'Atualizar Tarefa' : 'Agendar Tarefa'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}