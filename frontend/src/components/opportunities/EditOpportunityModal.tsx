import React, { useState, useEffect } from 'react';
import { X, DollarSign, TrendingUp, Calendar, Percent, Target, FileText, User } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import toast from 'react-hot-toast';

interface EditOpportunityModalProps {
  opportunityId: string;
  currentData: {
    title?: string;
    value?: number;
    probability?: number;
    expected_close?: string;
    notes?: string;
    owner_id?: string;
    stage_id?: string;
    status?: string;
  };
  isOpen: boolean;
  onClose: () => void;
}

export default function EditOpportunityModal({
  opportunityId,
  currentData,
  isOpen,
  onClose
}: EditOpportunityModalProps) {
  const [formData, setFormData] = useState({
    title: currentData.title || '',
    value: currentData.value?.toString() || '',
    probability: currentData.probability || 50,
    expected_close: currentData.expected_close || '',
    notes: currentData.notes || '',
    status: currentData.status || 'open'
  });

  const queryClient = useQueryClient();

  // Buscar estágios disponíveis
  const { data: pipelines } = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => api.get('/opportunities/pipelines').then(r => r.data),
    enabled: isOpen
  });

  // Encontrar estágios do pipeline padrão
  const defaultPipeline = pipelines?.find((p: any) => p.is_default);
  const stages = defaultPipeline?.stages || [];

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      api.put(`/opportunities/${opportunityId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunity', opportunityId] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      toast.success('Oportunidade atualizada com sucesso!');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Erro ao atualizar oportunidade');
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

    const updateData = {
      ...formData,
      value: parseFloat(formData.value),
      probability: parseInt(formData.probability.toString())
    };

    updateMutation.mutate(updateData);
  };

  const handleChange = (field: keyof typeof formData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Atualizar formData quando currentData mudar
  useEffect(() => {
    if (currentData) {
      setFormData({
        title: currentData.title || '',
        value: currentData.value?.toString() || '',
        probability: currentData.probability || 50,
        expected_close: currentData.expected_close || '',
        notes: currentData.notes || '',
        status: currentData.status || 'open'
      });
    }
  }, [currentData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-dark-100 flex items-center gap-2">
            <Target size={20} /> Editar Oportunidade
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

          {/* Data de fechamento e Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-dark-400 font-medium mb-1 flex items-center gap-1">
                <Calendar size={12} /> Fechamento Esperado
              </label>
              <input
                type="date"
                value={formData.expected_close}
                onChange={e => handleChange('expected_close', e.target.value)}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-xs text-dark-400 font-medium mb-1 flex items-center gap-1">
                <Target size={12} /> Status
              </label>
              <select
                value={formData.status}
                onChange={e => handleChange('status', e.target.value)}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="open">Aberta</option>
                <option value="won">Ganho</option>
                <option value="lost">Perdido</option>
              </select>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="text-xs text-dark-400 font-medium mb-1 block flex items-center gap-1">
              <FileText size={12} /> Notas
            </label>
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