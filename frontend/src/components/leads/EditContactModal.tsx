import React, { useState } from 'react';
import { X, Mail, Phone, Building, MapPin, Briefcase, Edit2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface EditContactModalProps {
  leadId: string;
  currentData: {
    email?: string;
    phone?: string;
    company?: string;
    position?: string;
    location?: string;
    notes?: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

export default function EditContactModal({
  leadId,
  currentData,
  isOpen,
  onClose
}: EditContactModalProps) {
  const [formData, setFormData] = useState({
    email: currentData.email || '',
    phone: currentData.phone || '',
    company: currentData.company || '',
    position: currentData.position || '',
    location: currentData.location || '',
    notes: currentData.notes || ''
  });

  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      api.put(`/leads/${leadId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      toast.success('Informações atualizadas com sucesso!');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Erro ao atualizar informações');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validação básica
    if (formData.email && !isValidEmail(formData.email)) {
      toast.error('Por favor, insira um e-mail válido');
      return;
    }

    if (formData.phone && !isValidPhone(formData.phone)) {
      toast.error('Por favor, insira um telefone válido');
      return;
    }

    updateMutation.mutate(formData);
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidPhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 11;
  };

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 11) {
      if (digits.length <= 2) return digits;
      if (digits.length <= 6) return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
      if (digits.length <= 10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
      return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7,11)}`;
    }
    return value;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-md p-6 shadow-2xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-dark-100 flex items-center gap-2">
            <Edit2 size={20} /> Editar Informações do Lead
          </h2>
          <button onClick={onClose} className="text-dark-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
          <p className="text-sm text-indigo-400">
            Adicione ou atualize as informações de contato. Campos vazios serão mantidos como estão.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="text-xs text-dark-400 font-medium mb-1 flex items-center gap-1">
              <Mail size={12} /> E-mail
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={e => handleChange('email', e.target.value)}
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="email@empresa.com"
            />
          </div>

          {/* Telefone */}
          <div>
            <label className="text-xs text-dark-400 font-medium mb-1 flex items-center gap-1">
              <Phone size={12} /> Telefone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={e => handleChange('phone', formatPhone(e.target.value))}
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="(11) 99999-9999"
              maxLength={15}
            />
          </div>

          {/* Empresa */}
          <div>
            <label className="text-xs text-dark-400 font-medium mb-1 flex items-center gap-1">
              <Building size={12} /> Empresa
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={e => handleChange('company', e.target.value)}
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Nome da empresa"
            />
          </div>

          {/* Cargo */}
          <div>
            <label className="text-xs text-dark-400 font-medium mb-1 flex items-center gap-1">
              <Briefcase size={12} /> Cargo
            </label>
            <input
              type="text"
              value={formData.position}
              onChange={e => handleChange('position', e.target.value)}
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Ex: Gerente, Diretor, etc."
            />
          </div>

          {/* Localização */}
          <div>
            <label className="text-xs text-dark-400 font-medium mb-1 flex items-center gap-1">
              <MapPin size={12} /> Localização
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={e => handleChange('location', e.target.value)}
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Cidade, Estado"
            />
          </div>

          {/* Informações adicionais */}
          <div>
            <label className="text-xs text-dark-400 font-medium mb-1">Informações Adicionais</label>
            <textarea
              value={formData.notes}
              onChange={e => handleChange('notes', e.target.value)}
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[100px] resize-none"
              placeholder="Observações importantes sobre o lead..."
              rows={4}
            />
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
              disabled={updateMutation.isPending}
              className="flex-1 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium text-sm disabled:opacity-50 transition-colors"
            >
              {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}