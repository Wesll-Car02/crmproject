import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Mail, Phone, Calendar, Star, Building2, UserCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import ContactModal from './ContactModal';
import { formatDate } from '../../utils/leadUtils';

interface LeadContactsTabProps {
  leadId: string;
}

export default function LeadContactsTab({ leadId }: LeadContactsTabProps) {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['lead-contacts', leadId],
    queryFn: () => api.get(`/leads/${leadId}/contacts`).then(r => r.data),
    enabled: !!leadId,
  });

  const deleteMutation = useMutation({
    mutationFn: (contactId: string) => api.delete(`/leads/${leadId}/contacts/${contactId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-contacts', leadId] });
      toast.success('Contato removido com sucesso!');
    },
    onError: () => toast.error('Erro ao remover contato')
  });

  const handleDelete = (contactId: string) => {
    if (window.confirm('Tem certeza que deseja remover este contato?')) {
      deleteMutation.mutate(contactId);
    }
  };

  const handleEdit = (contact: any) => {
    setEditingContact(contact);
    setShowModal(true);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center z-10 relative">
        <h3 className="text-lg font-medium text-dark-100">Contatos Relacionados</h3>
        <button
          onClick={() => { setEditingContact(null); setShowModal(true); }}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} /> Adicionar Contato
        </button>
      </div>

      <div className="space-y-3 z-10 relative">
        {contacts.length === 0 ? (
          <div className="text-center py-8 bg-dark-800/20 border border-dark-700/50 rounded-xl">
            <UserCircle size={32} className="mx-auto mb-2 text-dark-500 opacity-50" />
            <p className="text-dark-400">Nenhum contato relacionado encontrado.</p>
            <p className="text-sm mt-1 text-dark-500">Adicione pessoas importantes (sócios, decisores) ligadas a esta empresa.</p>
          </div>
        ) : (
          contacts.map((contact: any) => (
            <div key={contact.id} className="p-4 bg-dark-800/40 border border-dark-700/50 rounded-xl relative group">
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex-shrink-0">
                    <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 font-bold text-lg">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-dark-100">{contact.name}</h4>
                      {contact.is_favorite && (
                        <span className="text-amber-400 flex items-center text-xs gap-1 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20" title="Contato Favorito">
                          <Star size={12} fill="currentColor" /> Favorito
                        </span>
                      )}
                      {contact.is_decision_maker && (
                        <span className="text-emerald-400 flex items-center text-xs gap-1 bg-emerald-400/10 px-1.5 py-0.5 rounded border border-emerald-400/20">
                          <Star size={12} fill="currentColor" /> Decisor / Principal
                        </span>
                      )}
                    </div>
                    {contact.role && (
                      <div className="text-indigo-400 text-sm font-medium flex items-center gap-1.5 mt-0.5">
                        <Building2 size={14} /> {contact.role}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(contact)} className="p-1.5 text-dark-400 hover:text-indigo-400 hover:bg-dark-700 rounded-lg transition-colors">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(contact.id)} className="p-1.5 text-dark-400 hover:text-rose-400 hover:bg-dark-700 rounded-lg transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-3 pl-13 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                {contact.email && (
                  <div className="flex items-center gap-1.5 text-dark-300">
                    <Mail size={14} className="text-dark-500" /> {contact.email}
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-1.5 text-dark-300">
                    <Phone size={14} className="text-dark-500" /> {contact.phone}
                  </div>
                )}
                {contact.birth_date && (
                  <div className="flex items-center gap-1.5 text-dark-300">
                    <Calendar size={14} className="text-dark-500" /> {formatDate(contact.birth_date).split(' ')[0]}
                  </div>
                )}
              </div>

              {contact.notes && (
                <div className="mt-3 pl-13">
                  <p className="text-sm text-dark-400 bg-dark-900/50 p-2.5 rounded-lg border border-dark-700/50 italic flex flex-col gap-1">
                    {contact.source === 'quadro_societario' && (
                      <span className="text-xs text-indigo-400 not-italic font-medium mb-1">
                        Origem: Importado do Quadro Societário
                      </span>
                    )}
                    "{contact.notes}"
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <ContactModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        leadId={leadId}
        contactToEdit={editingContact}
      />
    </div>
  );
}
