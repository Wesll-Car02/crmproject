import React, { useState, useEffect } from 'react';
import { X, Tag, Plus, Search } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { addTagToLead, fetchAvailableTags, Tag as TagType } from '../../utils/leadUtils';

interface AddTagModalProps {
  leadId: string;
  currentTags: TagType[];
  isOpen: boolean;
  onClose: () => void;
  onTagAdded: () => void;
}

export default function AddTagModal({
  leadId,
  currentTags,
  isOpen,
  onClose,
  onTagAdded
}: AddTagModalProps) {
  const [search, setSearch] = useState('');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6'); // Cor padrão azul

  const queryClient = useQueryClient();

  const { data: availableTags = [], isLoading } = useQuery({
    queryKey: ['available-tags'],
    queryFn: fetchAvailableTags
  });

  const addTagMutation = useMutation({
    mutationFn: ({ leadId, tagIds }: { leadId: string; tagIds: string[] }) =>
      Promise.all(tagIds.map(tagId => addTagToLead(leadId, tagId))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', leadId] });
      onTagAdded();
      toast.success(`${selectedTagIds.length > 1 ? 'Tags adicionadas' : 'Tag adicionada'} com sucesso!`);
      onClose();
    }
  });

  const createTagMutation = useMutation({
    mutationFn: (tagData: { name: string; color: string }) =>
      api.post('/tags', tagData),
    onSuccess: (response) => {
      const newTag = response.data;
      addTagMutation.mutate({ leadId, tagIds: [newTag.id] });
    }
  });

  const filteredTags = availableTags.filter(tag =>
    tag.name.toLowerCase().includes(search.toLowerCase()) &&
    !currentTags.some(t => t.id === tag.id)
  );

  const handleAddExistingTags = () => {
    if (selectedTagIds.length === 0) {
      toast.error('Selecione pelo menos uma tag para adicionar');
      return;
    }
    addTagMutation.mutate({ leadId, tagIds: selectedTagIds });
  };

  const toggleTagSelection = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleCreateAndAddTag = () => {
    if (!newTagName.trim()) {
      toast.error('Digite um nome para a tag');
      return;
    }
    createTagMutation.mutate({
      name: newTagName.trim(),
      color: newTagColor
    });
  };

  const colorOptions = [
    { name: 'Azul', value: '#3b82f6' },
    { name: 'Vermelho', value: '#ef4444' },
    { name: 'Verde', value: '#10b981' },
    { name: 'Amarelo', value: '#f59e0b' },
    { name: 'Roxo', value: '#8b5cf6' },
    { name: 'Rosa', value: '#ec4899' },
    { name: 'Cinza', value: '#6b7280' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-dark-100 flex items-center gap-2">
            <Tag size={20} /> Adicionar Tag
          </h2>
          <button onClick={onClose} className="text-dark-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          {/* Seção 1: Tags existentes */}
          <div>
            <h3 className="text-sm font-medium text-dark-300 mb-3">Tags disponíveis</h3>
            <div className="relative mb-3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar tags..."
                className="w-full bg-dark-800 border border-dark-700 rounded-lg pl-9 pr-3 py-2 text-sm text-dark-100 placeholder:text-dark-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {isLoading ? (
              <div className="text-center py-4 text-dark-500">Carregando tags...</div>
            ) : filteredTags.length === 0 ? (
              <div className="text-center py-4 text-dark-500">Nenhuma tag disponível</div>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-2">
                {filteredTags.map(tag => (
                  <div
                    key={tag.id}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-dark-800 ${selectedTagIds.includes(tag.id) ? 'bg-dark-800 border border-indigo-500/30' : ''}`}
                    onClick={() => toggleTagSelection(tag.id)}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tag.color || '#3b82f6' }}
                      />
                      <span className="text-sm text-dark-100">{tag.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedTagIds.includes(tag.id) && (
                        <div className="text-xs text-indigo-400">
                          {selectedTagIds.indexOf(tag.id) + 1}
                        </div>
                      )}
                      <input
                        type="checkbox"
                        checked={selectedTagIds.includes(tag.id)}
                        onChange={() => toggleTagSelection(tag.id)}
                        className="w-4 h-4 rounded border-dark-600 bg-dark-700 text-indigo-500 focus:ring-indigo-500 focus:ring-2"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filteredTags.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="text-xs text-dark-500">
                  {selectedTagIds.length > 0 ? `${selectedTagIds.length} tag(s) selecionada(s)` : 'Selecione uma ou mais tags'}
                </div>
                <button
                  onClick={handleAddExistingTags}
                  disabled={addTagMutation.isPending || selectedTagIds.length === 0}
                  className="w-full py-2 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white rounded-lg font-medium transition-colors text-sm"
                >
                  {addTagMutation.isPending ? 'Adicionando...' : `Adicionar ${selectedTagIds.length > 1 ? `${selectedTagIds.length} Tags` : 'Tag'}`}
                </button>
              </div>
            )}
          </div>

          {/* Divisor */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-dark-700"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-dark-900 text-dark-500">OU</span>
            </div>
          </div>

          {/* Seção 2: Criar nova tag */}
          <div>
            <h3 className="text-sm font-medium text-dark-300 mb-3">Criar nova tag</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-dark-400 font-medium mb-1 block">Nome da Tag *</label>
                <input
                  type="text"
                  value={newTagName}
                  onChange={e => setNewTagName(e.target.value)}
                  placeholder="Ex: Cliente VIP, Follow-up, etc."
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg px-3 py-2 text-sm text-dark-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs text-dark-400 font-medium mb-1 block">Cor</label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map(color => (
                    <button
                      key={color.value}
                      onClick={() => setNewTagColor(color.value)}
                      className={`w-8 h-8 rounded-full border-2 ${newTagColor === color.value ? 'border-white' : 'border-dark-600'}`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={handleCreateAndAddTag}
                disabled={createTagMutation.isPending || !newTagName.trim()}
                className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors text-sm flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                {createTagMutation.isPending ? 'Criando...' : 'Criar e Adicionar Tag'}
              </button>
            </div>
          </div>

          {/* Tags atuais */}
          {currentTags.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-dark-300 mb-2">Tags atuais do lead</h3>
              <div className="flex flex-wrap gap-1.5">
                {currentTags.map(tag => (
                  <span
                    key={tag.id}
                    className="text-xs px-2.5 py-1 rounded-full bg-dark-800 border border-dark-700 text-dark-200 flex items-center gap-1"
                    style={tag.color ? { borderColor: tag.color + '44', color: tag.color } : {}}
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: tag.color || '#6b7280' }}
                    />
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}