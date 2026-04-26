import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Briefcase, Mail, Phone, Calendar, Star, AlignLeft } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../lib/api';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadId: string;
  contactToEdit?: any;
}

export default function ContactModal({ isOpen, onClose, leadId, contactToEdit }: ContactModalProps) {
  const queryClient = useQueryClient();
  const isEditing = !!contactToEdit;

  const [formData, setFormData] = useState({
    name: '',
    role: '',
    email: '',
    phone: '',
    birthDate: '',
    notes: '',
    isFavorite: false,
    isDecisionMaker: false
  });

  useEffect(() => {
    if (contactToEdit && isOpen) {
      setFormData({
        name: contactToEdit.name || '',
        role: contactToEdit.role || '',
        email: contactToEdit.email || '',
        phone: contactToEdit.phone || '',
        birthDate: contactToEdit.birth_date ? contactToEdit.birth_date.split('T')[0] : '',
        notes: contactToEdit.notes || '',
        isFavorite: contactToEdit.is_favorite || false,
        isDecisionMaker: contactToEdit.is_decision_maker || false
      });
    } else if (isOpen) {
      setFormData({
        name: '', role: '', email: '', phone: '', birthDate: '', notes: '',
        isFavorite: false, isDecisionMaker: false
      });
    }
  }, [contactToEdit, isOpen]);

  const mutation = useMutation({
    mutationFn: (data: any) => {
      if (isEditing) {
        return api.put(`/leads/${leadId}/contacts/${contactToEdit.id}`, data);
      }
      return api.post(`/leads/${leadId}/contacts`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-contacts', leadId] });
      toast.success(`Contato ${isEditing ? 'atualizado' : 'adicionado'} com sucesso!`);
      onClose();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || `Erro ao ${isEditing ? 'atualizar' : 'adicionar'} contato`);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('O nome do contato é obrigatório');
      return;
    }
    mutation.mutate({
      ...formData,
      birthDate: formData.birthDate && formData.birthDate.trim() !== '' ? formData.birthDate : null,
      email:  formData.email.trim()  || null,
      phone:  formData.phone.trim()  || null,
      role:   formData.role.trim()   || null,
      notes:  formData.notes.trim()  || null,
    });
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-dark-800 border border-dark-700 w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header fixo */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-dark-700/50 flex-shrink-0">
          <h2 className="text-lg font-semibold text-white">
            {isEditing ? 'Editar Contato Relacionado' : 'Novo Contato Relacionado'}
          </h2>
          <button onClick={onClose} className="text-dark-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-dark-700">
            <X size={20} />
          </button>
        </div>

        {/* Body rolável */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

            <div>
              <label className="block text-sm font-medium text-dark-200 mb-1">
                Nome <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl py-2.5 pl-9 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="Nome completo do contato"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-200 mb-1">Função</label>
              <div className="relative">
                <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                <input
                  type="text"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl py-2.5 pl-9 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                  placeholder="Ex: Sócio administrador, Gerente financeiro..."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-1">E-mail</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl py-2.5 pl-9 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    placeholder="email@empresa.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-200 mb-1">Telefone</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-dark-900 border border-dark-700 rounded-xl py-2.5 pl-9 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-200 mb-1">Data de Nascimento</label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
                <input
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl py-2.5 pl-9 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-200 mb-1">Observação</label>
              <div className="relative">
                <AlignLeft size={16} className="absolute left-3 top-3 text-dark-500" />
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-dark-900 border border-dark-700 rounded-xl py-2.5 pl-9 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                  placeholder="Observações importantes sobre o contato..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input type="checkbox" checked={formData.isFavorite} onChange={(e) => setFormData({ ...formData, isFavorite: e.target.checked })} className="sr-only" />
                  <div className={`w-5 h-5 rounded border ${formData.isFavorite ? 'bg-amber-500 border-amber-500' : 'bg-dark-900 border-dark-600 group-hover:border-amber-500/50'} transition-colors flex items-center justify-center`}>
                    {formData.isFavorite && <Star size={12} className="text-white" fill="currentColor" />}
                  </div>
                </div>
                <span className="text-sm text-dark-200 group-hover:text-white transition-colors">Contato favorito</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative flex items-center justify-center">
                  <input type="checkbox" checked={formData.isDecisionMaker} onChange={(e) => setFormData({ ...formData, isDecisionMaker: e.target.checked })} className="sr-only" />
                  <div className={`w-5 h-5 rounded border ${formData.isDecisionMaker ? 'bg-emerald-500 border-emerald-500' : 'bg-dark-900 border-dark-600 group-hover:border-emerald-500/50'} transition-colors flex items-center justify-center`}>
                    {formData.isDecisionMaker && <Star size={12} className="text-white" fill="currentColor" />}
                  </div>
                </div>
                <span className="text-sm text-dark-200 group-hover:text-white transition-colors">Decisor / Principal</span>
              </label>
            </div>

          </div>

          {/* Footer fixo — sempre visível */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-dark-700/50 flex-shrink-0 bg-dark-800">
            <button type="button" onClick={onClose} className="px-4 py-2 text-dark-300 hover:text-white font-medium transition-colors rounded-lg hover:bg-dark-700">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-6 py-2 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white rounded-xl font-medium transition-colors flex items-center gap-2 shadow-lg shadow-indigo-500/20"
            >
              {mutation.isPending
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : isEditing ? 'Salvar Contato' : 'Adicionar Contato'}
            </button>
          </div>
        </form>

      </div>
    </div>,
    document.body
  );
}
