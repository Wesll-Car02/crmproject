import React, { useState } from 'react';
import { X, DollarSign, Calendar, Percent, Target } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface ConvertLeadModalProps {
  leadId: string;
  leadName: string;
  leadCompany: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ConvertLeadModal({
  leadId,
  leadName,
  leadCompany,
  isOpen,
  onClose,
  onSuccess
}: ConvertLeadModalProps) {
  const [formData, setFormData] = useState({
    title: `Oportunidade: ${leadName} - ${leadCompany}`,
    value: '',
    expected_close_date: '',
    probability: 50,
    notes: ''
  });

  const queryClient = useQueryClient();

  const convertMutation = useMutation({
    mutationFn: (opportunityData: any) =>
      api.post(`/leads/${leadId}/convert`, opportunityData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast.success('Lead convertido em oportunidade com sucesso!');
      onClose();
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Erro ao converter lead');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    if (!formData.value || parseFloat(formData.value) <= 0) {
      toast.error('Valor deve ser maior que zero');
      return;
    }

    if (!formData.expected_close_date) {
      toast.error('Data de fechamento esperada é obrigatória');
      return;
    }

    const opportunityData = {
      ...formData,
      value: parseFloat(formData.value),
      probability: parseInt(formData.probability.toString())
    };

    convertMutation.mutate(opportunityData);
  };

  const handleChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Gerar data mínima (amanhã)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-dark-100 flex items-center gap-2">
            <Target size={20} /> Converter Lead
          </h2>
          <button onClick={onClose} className="text-dark-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
          <p className="text-sm text-emerald-400">
            Convertendo <span className="font-semibold">{leadName}</span> da empresa <span className="font-semibold">{leadCompany}</span> em uma oportunidade.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Título */}
          <div>
            <label className="text-xs text-dark-400 font-medium mb-1 block">Título da Oportunidade *</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => handleChange('title', e.target.value)}
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Valor e Probabilidade */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-dark-400 font-medium mb-1 flex items-center gap-1">
                <DollarSign size={12} /> Valor (R$) *
              </label>
              <input
                type="number"
                value={formData.value}
                onChange={e => handleChange('value', e.target.value)}
                min="0"
                step="0.01"
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <label className="text-xs text-dark-400 font-medium mb-1 flex items-center gap-1">
                <Percent size={12} /> Probabilidade (%)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={formData.probability}
                  onChange={e => handleChange('probability', parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-medium text-dark-100 w-10 text-center">
                  {formData.probability}%
                </span>
              </div>
            </div>
          </div>

          {/* Data de fechamento */}
          <div>
            <label className="text-xs text-dark-400 font-medium mb-1 flex items-center gap-1">
              <Calendar size={12} /> Fechamento Esperado *
            </label>
            <input
              type="date"
              value={formData.expected_close_date}
              onChange={e => handleChange('expected_close_date', e.target.value)}
              min={minDate}
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Notas */}
          <div>
            <label className="text-xs text-dark-400 font-medium mb-1 block">Notas</label>
            <textarea
              value={formData.notes}
              onChange={e => handleChange('notes', e.target.value)}
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-h-[80px] resize-none"
              placeholder="Informações importantes sobre esta oportunidade..."
              rows={3}
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
              disabled={convertMutation.isPending}
              className="flex-1 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium text-sm disabled:opacity-50 transition-colors"
            >
              {convertMutation.isPending ? 'Convertendo...' : 'Converter em Oportunidade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}