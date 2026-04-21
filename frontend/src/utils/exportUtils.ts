import toast from 'react-hot-toast';

export interface ExportOptions {
  format: 'csv' | 'excel' | 'json';
  includeFields: string[];
  filters?: {
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    scoreMin?: number;
    scoreMax?: number;
  };
}

export async function exportLeads(
  leads: any[],
  options: ExportOptions = {
    format: 'csv',
    includeFields: ['name', 'email', 'phone', 'company', 'status', 'score', 'created_at']
  }
): Promise<void> {
  try {
    if (leads.length === 0) {
      toast.error('Nenhum lead para exportar');
      return;
    }

    // Filtrar leads se necessário
    let filteredLeads = [...leads];

    if (options.filters) {
      if (options.filters.status) {
        filteredLeads = filteredLeads.filter(lead => lead.status === options.filters?.status);
      }
      if (options.filters.dateFrom) {
        filteredLeads = filteredLeads.filter(lead =>
          new Date(lead.created_at) >= new Date(options.filters!.dateFrom!)
        );
      }
      if (options.filters.dateTo) {
        filteredLeads = filteredLeads.filter(lead =>
          new Date(lead.created_at) <= new Date(options.filters!.dateTo!)
        );
      }
      if (options.filters.scoreMin !== undefined) {
        filteredLeads = filteredLeads.filter(lead =>
          (lead.score || 0) >= options.filters!.scoreMin!
        );
      }
      if (options.filters.scoreMax !== undefined) {
        filteredLeads = filteredLeads.filter(lead =>
          (lead.score || 0) <= options.filters!.scoreMax!
        );
      }
    }

    // Preparar dados para exportação
    const data = filteredLeads.map(lead => {
      const row: Record<string, any> = {};
      options.includeFields.forEach(field => {
        if (field === 'tags') {
          row[field] = (lead.tags || []).map((t: any) => typeof t === 'object' ? t.name : t).join(', ');
        } else if (field === 'created_at') {
          row[field] = lead[field] ? new Date(lead[field]).toLocaleDateString('pt-BR') : '';
        } else {
          row[field] = lead[field] || '';
        }
      });
      return row;
    });

    // Exportar no formato selecionado
    switch (options.format) {
      case 'csv':
        exportToCSV(data, options.includeFields);
        break;
      case 'excel':
        exportToExcel(data, options.includeFields);
        break;
      case 'json':
        exportToJSON(data);
        break;
    }

    toast.success(`${filteredLeads.length} lead(s) exportado(s) com sucesso!`);
  } catch (error) {
    console.error('Erro ao exportar leads:', error);
    toast.error('Erro ao exportar leads');
  }
}

function exportToCSV(data: Record<string, any>[], headers: string[]): void {
  // Converter headers para português
  const headerMap: Record<string, string> = {
    'name': 'Nome',
    'email': 'E-mail',
    'phone': 'Telefone',
    'company': 'Empresa',
    'position': 'Cargo',
    'status': 'Status',
    'score': 'Score',
    'source': 'Origem',
    'location': 'Localização',
    'tags': 'Tags',
    'created_at': 'Data de Criação',
    'owner_name': 'Responsável',
    'notes': 'Observações'
  };

  const translatedHeaders = headers.map(h => headerMap[h] || h);

  // Criar conteúdo CSV
  const csvContent = [
    translatedHeaders.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        // Escapar vírgulas e aspas
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  // Criar e baixar arquivo
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `leads_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportToExcel(data: Record<string, any>[], headers: string[]): void {
  // Para Excel, vamos usar CSV com extensão .xls para simplicidade
  // Em uma implementação real, usaríamos uma biblioteca como xlsx
  exportToCSV(data, headers);

  // Notificar usuário sobre a limitação
  toast('Exportado como CSV (compatível com Excel)', {
    icon: '📊',
    duration: 3000
  });
}

function exportToJSON(data: Record<string, any>[]): void {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `leads_${new Date().toISOString().split('T')[0]}.json`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Função para exportação rápida (um clique)
export function quickExportLeads(leads: any[]): void {
  exportLeads(leads, {
    format: 'csv',
    includeFields: ['name', 'email', 'phone', 'company', 'status', 'score', 'created_at', 'tags']
  });
}

// Função para exportação avançada com modal
export async function advancedExportLeads(
  leads: any[],
  onFormatSelect?: (format: 'csv' | 'excel' | 'json') => void,
  onFieldSelect?: (fields: string[]) => void
): Promise<void> {
  // Em uma implementação real, isso abriria um modal
  // Por enquanto, vamos usar um prompt simples
  const format = window.prompt(
    'Selecione o formato de exportação:\n1. CSV\n2. Excel\n3. JSON\n\nDigite 1, 2 ou 3:'
  );

  let selectedFormat: 'csv' | 'excel' | 'json' = 'csv';

  switch (format) {
    case '1':
      selectedFormat = 'csv';
      break;
    case '2':
      selectedFormat = 'excel';
      break;
    case '3':
      selectedFormat = 'json';
      break;
    default:
      toast.error('Formato inválido');
      return;
  }

  if (onFormatSelect) {
    onFormatSelect(selectedFormat);
  }

  // Campos padrão para exportação avançada
  const defaultFields = ['name', 'email', 'phone', 'company', 'position', 'status', 'score', 'source', 'created_at', 'tags'];

  if (onFieldSelect) {
    onFieldSelect(defaultFields);
  }

  await exportLeads(leads, {
    format: selectedFormat,
    includeFields: defaultFields
  });
}