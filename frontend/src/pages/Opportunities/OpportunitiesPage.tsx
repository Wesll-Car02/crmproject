import React, { useState, useCallback, useEffect } from 'react';
import {
  Target, Search, Filter, Plus, LayoutGrid, LayoutList, MoreVertical,
  Calendar, DollarSign, GripVertical, X, Settings, Trash2, Tag, FolderPlus
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext, closestCorners, PointerSensor, useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import toast from 'react-hot-toast';
import api from '../../lib/api';

// ─── Deal Card (Kanban) ───────────────────────────────────────────────────────

function DealCard({ deal }: { deal: any }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style}
      className={`glass-card p-4 border relative group hover:border-dark-500 transition-all cursor-grab active:cursor-grabbing
        ${isDragging ? 'border-blue-500 shadow-blue-500/20 shadow-lg' : 'border-white/5'}`}
    >
      <div {...attributes} {...listeners} className="absolute top-4 right-2 text-dark-500 opacity-0 group-hover:opacity-100 hover:text-white pb-2 pl-2">
        <GripVertical size={14} />
      </div>

      <div className="font-semibold text-dark-100 mb-0.5 pr-6 leading-tight text-sm">{deal.title}</div>
      <div className="text-xs text-dark-400 font-medium mb-3">{deal.lead_name || deal.company || '—'}</div>

      {/* Tags */}
      {deal.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {deal.tags.slice(0, 3).map((tag: any) => (
            <span key={tag.id} className="text-[10px] px-2 py-0.5 rounded-full border"
              style={{ backgroundColor: tag.color + '22', color: tag.color, borderColor: tag.color + '44' }}>
              {tag.name}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-1 text-base font-bold text-dark-100 mb-3">
        <DollarSign size={15} className="text-emerald-500" />
        {Number(deal.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </div>

      <div className="flex justify-between items-center pt-3 border-t border-dark-700/50">
        {deal.expected_close ? (
          <div className="flex items-center gap-1.5 text-xs text-dark-400 bg-dark-800/50 px-2 py-1 rounded">
            <Calendar size={11} /> {new Date(deal.expected_close).toLocaleDateString('pt-BR')}
          </div>
        ) : <span />}
        <div className="w-6 h-6 rounded-full bg-dark-700 border border-dark-600 flex items-center justify-center text-[10px] font-bold text-dark-300">
          {(deal.owner_name || '?').charAt(0)}
        </div>
      </div>
    </div>
  );
}

// ─── New Deal Modal ───────────────────────────────────────────────────────────

function NewDealModal({ open, onClose, pipelines, tags, onCreated }: {
  open: boolean; onClose: () => void; pipelines: any[]; tags: any[]; onCreated: () => void;
}) {
  const defaultPipeline = pipelines.find(p => p.is_default) || pipelines[0];
  const [form, setForm] = useState({
    title: '', value: '', pipelineId: defaultPipeline?.id || '', stageId: '',
    expectedClose: '', tagIds: [] as string[],
  });
  const [loading, setLoading] = useState(false);

  const stages = defaultPipeline?.stages || [];
  const currentStages = pipelines.find(p => p.id === form.pipelineId)?.stages || [];

  const toggleTag = (tagId: string) => {
    setForm(f => ({
      ...f, tagIds: f.tagIds.includes(tagId) ? f.tagIds.filter(t => t !== tagId) : [...f.tagIds, tagId]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Título é obrigatório'); return; }
    if (!form.stageId) { toast.error('Selecione uma etapa'); return; }
    setLoading(true);
    try {
      await api.post('/opportunities', { ...form, value: Number(form.value) || 0 });
      toast.success('Negócio criado!');
      onCreated();
      onClose();
    } catch { /* handled by interceptor */ } finally { setLoading(false); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-dark-100">Novo Negócio</h2>
          <button onClick={onClose} className="text-dark-400 hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-dark-400 font-medium mb-1 block">Título *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Nome do negócio" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-dark-400 font-medium mb-1 block">Valor (R$)</label>
              <input type="number" value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="0,00" min="0" step="0.01" />
            </div>
            <div>
              <label className="text-xs text-dark-400 font-medium mb-1 block">Fecha em</label>
              <input type="date" value={form.expectedClose} onChange={e => setForm(f => ({ ...f, expectedClose: e.target.value }))}
                className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="text-xs text-dark-400 font-medium mb-1 block">Pipeline</label>
            <select value={form.pipelineId} onChange={e => setForm(f => ({ ...f, pipelineId: e.target.value, stageId: '' }))}
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-blue-500">
              {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-dark-400 font-medium mb-1 block">Etapa *</label>
            <select value={form.stageId} onChange={e => setForm(f => ({ ...f, stageId: e.target.value }))}
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-blue-500">
              <option value="">Selecione uma etapa</option>
              {currentStages.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          {tags.length > 0 && (
            <div>
              <label className="text-xs text-dark-400 font-medium mb-2 block">Tags</label>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <button key={tag.id} type="button" onClick={() => toggleTag(tag.id)}
                    className={`text-xs px-3 py-1 rounded-full border transition-all ${form.tagIds.includes(tag.id) ? 'opacity-100 scale-105' : 'opacity-50'}`}
                    style={{ backgroundColor: tag.color + '22', color: tag.color, borderColor: tag.color + '44' }}>
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-dark-700 text-dark-300 hover:bg-dark-800 text-sm">Cancelar</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium text-sm disabled:opacity-50">
              {loading ? 'Criando...' : 'Criar Negócio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Sortable Stage Item ─────────────────────────────────────────────────────

function SortableStageItem({ stage, onDelete, pipelineId }: {
  stage: any; onDelete: (stageId: string) => void; pipelineId: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: stage.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style}
      className="flex items-center justify-between p-3 bg-dark-800/50 rounded-lg border border-dark-700/50 group">
      <div className="flex items-center gap-2 flex-1">
        <div className="cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
          <GripVertical size={14} className="text-dark-500 hover:text-dark-300" />
        </div>
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
        <span className="text-sm text-dark-100">{stage.name}</span>
        {stage.probability > 0 && <span className="text-xs text-dark-400">({stage.probability}%)</span>}
      </div>
      <button onClick={() => onDelete(stage.id)}
        className="text-dark-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all p-1">
        <Trash2 size={14} />
      </button>
    </div>
  );
}

// ─── Pipeline Manager Modal ───────────────────────────────────────────────────

function PipelineManagerModal({ open, onClose, pipeline, onUpdated }: {
  open: boolean; onClose: () => void; pipeline: any; onUpdated: () => void;
}) {
  const [newStageName, setNewStageName] = useState('');
  const [newStageColor, setNewStageColor] = useState('#6366f1');
  const [stages, setStages] = useState<any[]>([]);
  const qc = useQueryClient();

  // Inicializar stages quando pipeline mudar
  React.useEffect(() => {
    if (pipeline?.stages) {
      setStages([...pipeline.stages].sort((a, b) => a.sort_order - b.sort_order));
    }
  }, [pipeline]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const addStage = async () => {
    if (!newStageName.trim()) return;
    try {
      await api.post(`/opportunities/pipelines/${pipeline.id}/stages`, { name: newStageName, color: newStageColor });
      setNewStageName('');
      onUpdated();
      toast.success('Etapa adicionada!');
    } catch { /* handled */ }
  };

  const deleteStage = async (stageId: string) => {
    try {
      await api.delete(`/opportunities/pipelines/${pipeline.id}/stages/${stageId}`);
      onUpdated();
      toast.success('Etapa removida');
    } catch { /* handled */ }
  };

  const updateStageOrder = async (stageId: string, newOrder: number) => {
    try {
      await api.put(`/opportunities/pipelines/${pipeline.id}/stages/${stageId}/order`, { sortOrder: newOrder });
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Erro ao atualizar ordem');
    }
  };

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = stages.findIndex(s => s.id === active.id);
    const newIndex = stages.findIndex(s => s.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newStages = [...stages];
      const [movedStage] = newStages.splice(oldIndex, 1);
      newStages.splice(newIndex, 0, movedStage);

      // Atualizar sort_order para cada etapa
      const updatedStages = newStages.map((stage, index) => ({
        ...stage,
        sort_order: index
      }));

      setStages(updatedStages);

      // Enviar atualização para o backend
      updateStageOrder(movedStage.id, newIndex);
    }
  }, [stages]);

  if (!open || !pipeline) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-dark-100">Gerenciar Funil: {pipeline.name}</h2>
          <button onClick={onClose} className="text-dark-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="space-y-2 mb-6">
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            <SortableContext items={stages.map(s => s.id)} strategy={verticalListSortingStrategy}>
              {stages.map((stage: any) => (
                <SortableStageItem
                  key={stage.id}
                  stage={stage}
                  onDelete={deleteStage}
                  pipelineId={pipeline.id}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>

        <div className="flex gap-2">
          <input value={newStageName} onChange={e => setNewStageName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addStage()}
            className="flex-1 bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Nome da nova etapa" />
          <input type="color" value={newStageColor} onChange={e => setNewStageColor(e.target.value)}
            className="w-10 h-9 bg-dark-800 border border-dark-700 rounded-lg cursor-pointer p-1" />
          <button onClick={addStage} className="px-3 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-sm font-medium">
            <Plus size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── New Pipeline Modal ─────────────────────────────────────────────────────

function NewPipelineModal({ open, onClose, onCreated }: {
  open: boolean; onClose: () => void; onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Nome é obrigatório'); return; }
    setLoading(true);
    try {
      await api.post('/opportunities/pipelines', { name, description, isDefault });
      toast.success('Funil criado com sucesso!');
      setName('');
      setDescription('');
      setIsDefault(false);
      onCreated();
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Erro ao criar funil';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-dark-100">Novo Funil</h2>
          <button onClick={onClose} className="text-dark-400 hover:text-white"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-dark-400 font-medium mb-1 block">Nome *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Ex: Funil de Vendas Corporativas" required />
          </div>
          <div>
            <label className="text-xs text-dark-400 font-medium mb-1 block">Descrição</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              rows={2} className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              placeholder="Descreva o objetivo deste funil" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isDefault" checked={isDefault} onChange={e => setIsDefault(e.target.checked)}
              className="w-4 h-4 rounded border-dark-700 bg-dark-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 focus:ring-1" />
            <label htmlFor="isDefault" className="text-sm text-dark-300 cursor-pointer">
              Definir como funil padrão
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg border border-dark-700 text-dark-300 hover:bg-dark-800 text-sm">Cancelar</button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium text-sm disabled:opacity-50">
              {loading ? 'Criando...' : 'Criar Funil'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function OpportunitiesPage() {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [selectedPipelineId, setSelectedPipelineId] = useState('');
  const [search, setSearch] = useState('');
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [showPipelineManager, setShowPipelineManager] = useState(false);
  const [showNewPipeline, setShowNewPipeline] = useState(false);
  const qc = useQueryClient();

  const { data: pipelines = [], isLoading: loadingPipelines } = useQuery({
    queryKey: ['pipelines'],
    queryFn: () => api.get('/opportunities/pipelines').then(r => r.data),
  });

  // Set default pipeline when pipelines load
  useEffect(() => {
    if (pipelines.length && !selectedPipelineId) {
      setSelectedPipelineId(pipelines.find(p => p.is_default)?.id || pipelines[0]?.id);
    }
  }, [pipelines, selectedPipelineId]);

  const { data: tags = [], refetch: refetchTags } = useQuery({
    queryKey: ['tags'],
    queryFn: () => api.get('/tags').then(r => r.data),
  });

  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#6366f1');
  const [creatingTag, setCreatingTag] = useState(false);

  const createTag = async () => {
    if (!newTagName.trim()) return;
    setCreatingTag(true);
    try {
      await api.post('/tags', { name: newTagName, color: newTagColor });
      toast.success('Tag criada!');
      setNewTagName('');
      refetchTags();
    } catch {
      toast.error('Erro ao criar tag');
    } finally {
      setCreatingTag(false);
    }
  };

  const { data: opportunitiesData, isLoading: loadingOpps } = useQuery({
    queryKey: ['opportunities', selectedPipelineId, search],
    queryFn: () => api.get('/opportunities', { params: { pipelineId: selectedPipelineId || undefined, search: search || undefined } }).then(r => r.data),
    enabled: !!selectedPipelineId,
  });

  const { data: stats } = useQuery({
    queryKey: ['opportunities-stats'],
    queryFn: () => api.get('/opportunities/stats').then(r => r.data),
  });

  const deals: any[] = opportunitiesData?.data || opportunitiesData || [];
  const currentPipeline = (pipelines as any[]).find((p: any) => p.id === selectedPipelineId);
  const stages: any[] = currentPipeline?.stages || [];

  const moveStageMutation = useMutation({
    mutationFn: ({ id, stageId }: { id: string; stageId: string }) =>
      api.patch(`/opportunities/${id}/stage`, { stageId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['opportunities'] }),
    onError: () => toast.error('Erro ao mover negócio'),
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const deal = deals.find(d => d.id === active.id);
    const newStageId = stages.find(s => s.id === over.id)?.id;
    if (deal && newStageId && deal.stage_id !== newStageId) {
      moveStageMutation.mutate({ id: deal.id, stageId: newStageId });
    }
  }, [deals, stages, moveStageMutation]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['opportunities'] });
    qc.invalidateQueries({ queryKey: ['pipelines'] });
  };

  const isLoading = loadingPipelines || loadingOpps;

  return (
    <div className="space-y-6 animate-fade-in relative z-10 w-full pb-10 flex flex-col">
      <NewDealModal open={showNewDeal} onClose={() => setShowNewDeal(false)}
        pipelines={pipelines as any[]} tags={tags as any[]} onCreated={invalidate} />
      <PipelineManagerModal open={showPipelineManager} onClose={() => setShowPipelineManager(false)}
        pipeline={currentPipeline} onUpdated={invalidate} />
      <NewPipelineModal open={showNewPipeline} onClose={() => setShowNewPipeline(false)} onCreated={invalidate} />

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Target size={20} className="text-white" />
            </div>
            Oportunidades
          </h1>
          <p className="text-dark-400 mt-1 text-sm">Gerencie seu funil de vendas e acompanhe o forecast.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-dark-800 p-1 rounded-lg border border-dark-700 flex items-center">
            <button onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'kanban' ? 'bg-dark-700 text-white' : 'text-dark-400 hover:text-dark-200'}`} title="Kanban">
              <LayoutGrid size={16} />
            </button>
            <button onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-dark-700 text-white' : 'text-dark-400 hover:text-dark-200'}`} title="Lista">
              <LayoutList size={16} />
            </button>
          </div>

          <button onClick={() => setShowPipelineManager(true)}
            className="flex items-center gap-2 px-3 py-2 bg-dark-800 border border-dark-700 hover:bg-dark-700 text-dark-200 rounded-lg text-sm transition-all">
            <Settings size={15} /> Gerenciar Funil
          </button>
          <button onClick={() => setShowNewPipeline(true)}
            className="flex items-center gap-2 px-3 py-2 bg-dark-800 border border-dark-700 hover:bg-dark-700 text-dark-200 rounded-lg text-sm transition-all">
            <FolderPlus size={15} /> Novo Funil
          </button>
          <button onClick={() => setShowNewDeal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white rounded-lg font-medium transition-all shadow-lg shadow-blue-500/25 hover:-translate-y-0.5">
            <Plus size={18} /> Novo Negócio
          </button>
        </div>
      </div>

      {/* PIPELINE SELECTOR + SEARCH */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex overflow-x-auto hide-scrollbar gap-2">
          {(pipelines as any[]).map((p: any) => (
            <button key={p.id} onClick={() => setSelectedPipelineId(p.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap border transition-all ${
                selectedPipelineId === p.id
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                  : 'bg-dark-800/50 border-dark-700/50 text-dark-300 hover:text-dark-100'
              }`}>
              {p.name} {p.is_default && <span className="text-xs text-dark-500 ml-1">(padrão)</span>}
            </button>
          ))}
        </div>
        <div className="relative flex-1 max-w-md ml-auto">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar negócio, cliente..."
            className="w-full bg-dark-800/50 border border-dark-700/50 rounded-lg pl-10 pr-4 py-2 text-dark-100 placeholder:text-dark-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 text-sm" />
        </div>
      </div>

      {/* Quick Tag Creator */}
      <div className="glass-card p-4 border border-white/5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-dark-100 flex items-center gap-2">
            <Tag size={14} className="text-blue-500" /> Criar Nova Tag
          </h3>
          <span className="text-xs text-dark-500">Personalize seu funil</span>
        </div>
        <div className="flex gap-2">
          <input
            value={newTagName}
            onChange={e => setNewTagName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && createTag()}
            placeholder="Nome da tag"
            className="flex-1 bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="color"
            value={newTagColor}
            onChange={e => setNewTagColor(e.target.value)}
            className="w-10 h-9 bg-dark-800 border border-dark-700 rounded-lg cursor-pointer p-1"
          />
          <button
            onClick={createTag}
            disabled={creatingTag || !newTagName.trim()}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {creatingTag ? 'Criando...' : 'Criar'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {(tags as any[]).slice(0, 6).map(tag => (
            <span
              key={tag.id}
              className="text-xs px-3 py-1 rounded-full border"
              style={{ backgroundColor: tag.color + '22', color: tag.color, borderColor: tag.color + '44' }}
            >
              {tag.name}
            </span>
          ))}
          {(tags as any[]).length > 6 && (
            <span className="text-xs px-3 py-1 rounded-full border border-dark-700 text-dark-500">
              +{(tags as any[]).length - 6} mais
            </span>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* KANBAN VIEW */}
      {!isLoading && viewMode === 'kanban' && (
        <div className="overflow-x-auto hide-scrollbar pb-4 -mx-2 px-2">
          <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
            <div className="flex gap-4 min-w-max">
              {stages.map((stage: any) => {
                const stageDeals = deals.filter(d => d.stage_id === stage.id);
                const stageTotal = stageDeals.reduce((acc, d) => acc + Number(d.value || 0), 0);
                const color = stage.color || '#6366f1';

                return (
                  <div key={stage.id} id={stage.id} className="w-[300px] flex flex-col flex-shrink-0">
                    <div className="p-3 mb-3 rounded-xl border flex justify-between items-center"
                      style={{ borderColor: color + '33', backgroundColor: color + '0d' }}>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                        <h3 className="font-semibold text-dark-100 text-sm">{stage.name}</h3>
                        <span className="text-xs font-semibold text-dark-400 bg-dark-800 px-2 py-0.5 rounded-full border border-dark-700">{stageDeals.length}</span>
                      </div>
                      <div className="text-xs font-semibold text-dark-300">
                        R$ {stageTotal.toLocaleString('pt-BR')}
                      </div>
                    </div>
                    <SortableContext items={stageDeals.map(d => d.id)} strategy={verticalListSortingStrategy}>
                      <div className="flex-1 bg-dark-800/10 rounded-xl p-2 border border-dashed border-dark-700/50 min-h-[400px] flex flex-col gap-2 relative">
                        {stageDeals.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center text-sm text-dark-600">Arraste para cá</div>
                        )}
                        {stageDeals.map(deal => <DealCard key={deal.id} deal={deal} />)}
                      </div>
                    </SortableContext>
                  </div>
                );
              })}
            </div>
          </DndContext>
        </div>
      )}

      {/* LIST VIEW */}
      {!isLoading && viewMode === 'list' && (
        <div className="glass-card border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-dark-800/40 text-xs uppercase tracking-widest text-dark-400 border-b border-dark-700/50">
                  <th className="px-5 py-4 font-semibold">Negócio</th>
                  <th className="px-5 py-4 font-semibold">Tags</th>
                  <th className="px-5 py-4 font-semibold">Etapa</th>
                  <th className="px-5 py-4 font-semibold">Valor</th>
                  <th className="px-5 py-4 font-semibold">Fechamento</th>
                  <th className="px-5 py-4 font-semibold">Responsável</th>
                  <th className="px-5 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/30">
                {deals.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-16 text-dark-500">Nenhum negócio encontrado</td></tr>
                )}
                {deals.map(deal => (
                  <tr key={deal.id} className="hover:bg-dark-800/40 transition-colors group cursor-pointer">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-dark-100">{deal.title}</div>
                      <div className="text-xs text-dark-400 mt-0.5">{deal.lead_name || '—'}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(deal.tags || []).slice(0, 3).map((tag: any) => (
                          <span key={tag.id} className="text-[10px] px-2 py-0.5 rounded-full border"
                            style={{ backgroundColor: tag.color + '22', color: tag.color, borderColor: tag.color + '44' }}>
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs px-2 py-1 rounded-md border border-blue-500/20 bg-blue-500/10 text-blue-400">
                        {deal.stage_name || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-semibold text-dark-100 text-sm">
                        R$ {Number(deal.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-dark-400">
                      {deal.expected_close ? new Date(deal.expected_close).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-dark-700 border border-dark-600 flex items-center justify-center text-[10px] font-bold text-dark-300">
                          {(deal.owner_name || '?').charAt(0)}
                        </div>
                        <span className="text-sm text-dark-200">{deal.owner_name || '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button className="text-dark-500 hover:text-white p-1 rounded hover:bg-dark-700 opacity-0 group-hover:opacity-100 transition-all">
                        <MoreVertical size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
