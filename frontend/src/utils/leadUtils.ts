import React from 'react';
import { PhoneCall, Mail, Calendar, FileText, CheckSquare, MessageSquare, Target, Flame } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

// Tipos
export interface ContactInfo {
  email?: string;
  phone?: string;
  company?: string;
  position?: string;
  location?: string;
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
}

export interface Activity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'note' | 'task' | 'whatsapp' | 'status_change' | 'score_change';
  title: string;
  description: string;
  notes?: string;
  scheduled_at?: string;
  created_at: string;
  created_by?: string;
}

export interface Task extends Activity {
  type: 'task';
  due_date: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  completed: boolean;
}

// Funções para manipulação de tags
export async function addTagToLead(leadId: string, tagId: string): Promise<void> {
  try {
    await api.post(`/leads/${leadId}/tags`, { tagId });
    toast.success('Tag adicionada com sucesso!');
  } catch (error: any) {
    toast.error(error?.response?.data?.error || 'Erro ao adicionar tag');
    throw error;
  }
}

export async function removeTagFromLead(leadId: string, tagId: string): Promise<void> {
  try {
    await api.delete(`/leads/${leadId}/tags/${tagId}`);
    toast.success('Tag removida com sucesso!');
  } catch (error: any) {
    toast.error(error?.response?.data?.error || 'Erro ao remover tag');
    throw error;
  }
}

// Funções para atualizar informações de contato
export async function updateLeadContact(leadId: string, contactInfo: ContactInfo): Promise<void> {
  try {
    await api.put(`/leads/${leadId}`, contactInfo);
    toast.success('Informações atualizadas com sucesso!');
  } catch (error: any) {
    toast.error(error?.response?.data?.error || 'Erro ao atualizar informações');
    throw error;
  }
}

// Funções para atividades
export async function addActivityToLead(
  leadId: string,
  activity: Omit<Activity, 'id' | 'created_at'>
): Promise<Activity> {
  try {
    const response = await api.post(`/leads/${leadId}/activities`, activity);
    toast.success('Atividade registrada com sucesso!');
    return response.data;
  } catch (error: any) {
    toast.error(error?.response?.data?.error || 'Erro ao registrar atividade');
    throw error;
  }
}

export async function addNoteToLead(leadId: string, note: string): Promise<Activity> {
  return addActivityToLead(leadId, {
    type: 'note',
    title: 'Nota adicionada',
    description: 'Nova nota registrada',
    notes: note
  });
}

export async function addTaskToLead(
  leadId: string,
  task: Omit<Task, 'id' | 'created_at' | 'type'>
): Promise<Task> {
  try {
    const response = await api.post(`/leads/${leadId}/activities`, {
      ...task,
      type: 'task'
    });
    toast.success('Tarefa agendada com sucesso!');
    return response.data;
  } catch (error: any) {
    toast.error(error?.response?.data?.error || 'Erro ao agendar tarefa');
    throw error;
  }
}

// Funções para ações de comunicação
export function initiateCall(phone: string): void {
  if (!phone) {
    toast.error('Número de telefone não informado');
    return;
  }
  const cleanPhone = phone.replace(/\D/g, '');
  window.open(`tel:${cleanPhone}`, '_blank');
  toast.success(`Iniciando ligação para ${phone}`);
}

export function initiateWhatsApp(phone: string, message?: string): void {
  if (!phone) {
    toast.error('Número de telefone não informado');
    return;
  }
  const cleanPhone = phone.replace(/\D/g, '');
  const defaultMessage = 'Olá! Gostaria de conversar sobre nossa solução.';
  const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message || defaultMessage)}`;
  window.open(url, '_blank');
  toast.success(`Abrindo WhatsApp para ${phone}`);
}

export function initiateEmail(email: string, subject?: string, body?: string): void {
  if (!email) {
    toast.error('E-mail não informado');
    return;
  }
  const defaultSubject = 'Sobre nossa solução';
  const defaultBody = 'Olá, gostaria de agendar uma conversa sobre nossa solução.';
  const mailto = `mailto:${email}?subject=${encodeURIComponent(subject || defaultSubject)}&body=${encodeURIComponent(body || defaultBody)}`;
  window.open(mailto, '_blank');
  toast.success(`Abrindo e-mail para ${email}`);
}

// Função para converter lead em oportunidade
export async function convertLeadToOpportunity(
  leadId: string,
  opportunityData: {
    title: string;
    value: number;
    expected_close_date: string;
    probability: number;
    stage: string;
  }
): Promise<void> {
  try {
    await api.post(`/leads/${leadId}/convert`, opportunityData);
    toast.success('Lead convertido em oportunidade com sucesso!');
  } catch (error: any) {
    toast.error(error?.response?.data?.error || 'Erro ao converter lead');
    throw error;
  }
}

// Função para atualizar status do lead (usado no kanban)
export async function updateLeadStatus(leadId: string, status: string): Promise<void> {
  try {
    await api.put(`/leads/${leadId}`, { status });
    toast.success('Status atualizado com sucesso!');
  } catch (error: any) {
    toast.error(error?.response?.data?.error || 'Erro ao atualizar status');
    throw error;
  }
}

// Função para buscar todas as tags disponíveis
export async function fetchAvailableTags(): Promise<Tag[]> {
  try {
    const response = await api.get('/tags');
    return response.data;
  } catch (error: any) {
    toast.error('Erro ao buscar tags disponíveis');
    return [];
  }
}

// Função para formatar data para exibição
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Função para obter nome do ícone baseado no tipo de atividade
export function getActivityIcon(type: string): string {
  // Mapear tipos de atividades e tarefas para ícones
  const icons: Record<string, string> = {
    // Tipos de atividades (lead_activities)
    call: 'PhoneCall',
    email: 'Mail',
    meeting: 'Calendar',
    note: 'FileText',
    task: 'CheckSquare',
    whatsapp: 'MessageSquare',
    status_change: 'Target',
    score_change: 'Flame',

    // Tipos de tarefas (lead_tasks)
    proposta: 'FileText', // Proposta é como um documento
    ligacao: 'PhoneCall',
    reuniao: 'Calendar',
    compromisso: 'Calendar',
    feedback: 'MessageSquare',
    personalizado: 'CheckSquare'
  };

  return icons[type] || 'MessageSquare';
}

// Função para obter cor baseada no tipo de atividade
export function getActivityColor(type: string): string {
  // Mapear tipos de atividades e tarefas para cores
  const colors: Record<string, string> = {
    // Tipos de atividades (lead_activities)
    call: 'amber',
    email: 'indigo',
    meeting: 'purple',
    note: 'blue',
    task: 'emerald',
    whatsapp: 'green',
    status_change: 'violet',
    score_change: 'orange',

    // Tipos de tarefas (lead_tasks)
    proposta: 'blue',
    ligacao: 'amber',
    reuniao: 'purple',
    compromisso: 'purple',
    feedback: 'green',
    personalizado: 'emerald'
  };

  return colors[type] || 'indigo';
}

// Função para integrar tarefa com calendário do sistema
export async function syncTaskWithCalendar(taskData: {
  title: string;
  description: string;
  startDateTime: string;
  endDateTime: string;
  location?: string;
  attendees?: string[];
}): Promise<boolean> {
  try {
    // Para Google Calendar
    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(taskData.title)}&details=${encodeURIComponent(taskData.description)}&dates=${formatDateForGoogleCalendar(taskData.startDateTime)}/${formatDateForGoogleCalendar(taskData.endDateTime)}${taskData.location ? `&location=${encodeURIComponent(taskData.location)}` : ''}`;

    // Para Outlook
    const outlookCalendarUrl = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(taskData.title)}&body=${encodeURIComponent(taskData.description)}&startdt=${taskData.startDateTime}&enddt=${taskData.endDateTime}${taskData.location ? `&location=${encodeURIComponent(taskData.location)}` : ''}`;

    // Abrir opções para o usuário escolher
    if (window.confirm('Deseja adicionar esta tarefa ao seu calendário?\n\nClique em OK para Google Calendar ou Cancelar para Outlook.')) {
      window.open(googleCalendarUrl, '_blank');
    } else {
      window.open(outlookCalendarUrl, '_blank');
    }

    toast.success('Tarefa sincronizada com calendário!');
    return true;
  } catch (error) {
    toast.error('Erro ao sincronizar com calendário');
    console.error('Erro na sincronização com calendário:', error);
    return false;
  }
}

// Função auxiliar para formatar data para Google Calendar
function formatDateForGoogleCalendar(dateString: string): string {
  const date = new Date(dateString);
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

// Função para buscar tarefas agendadas
export async function fetchScheduledTasks(leadId?: string): Promise<Task[]> {
  try {
    const url = leadId ? `/leads/${leadId}/activities?type=task` : '/activities?type=task';
    const response = await api.get(url);
    return response.data;
  } catch (error: any) {
    toast.error('Erro ao buscar tarefas agendadas');
    return [];
  }
}

// Função para atualizar tarefa existente
export async function updateTask(taskId: string, taskData: Partial<Task>): Promise<Task> {
  try {
    const response = await api.put(`/activities/${taskId}`, taskData);
    toast.success('Tarefa atualizada com sucesso!');
    return response.data;
  } catch (error: any) {
    toast.error(error?.response?.data?.error || 'Erro ao atualizar tarefa');
    throw error;
  }
}

// Função para excluir tarefa
export async function deleteTask(taskId: string): Promise<void> {
  try {
    await api.delete(`/activities/${taskId}`);
    toast.success('Tarefa excluída com sucesso!');
  } catch (error: any) {
    toast.error(error?.response?.data?.error || 'Erro ao excluir tarefa');
    throw error;
  }
}