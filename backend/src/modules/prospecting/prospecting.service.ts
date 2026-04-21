import { query } from '../../database';
import * as leadsService from '../leads/leads.service';

const BRASIL_API_BASE = 'https://brasilapi.com.br/api';

function formatCNPJ(cnpj: string): string {
  const digits = cnpj.replace(/\D/g, '');
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

function parseSizeByCapital(capitalSocial: number): string {
  if (!capitalSocial || capitalSocial === 0) return 'Não informado';
  if (capitalSocial < 360000) return 'Microempresa (ME)';
  if (capitalSocial < 4800000) return 'Empresa de Pequeno Porte (EPP)';
  if (capitalSocial < 100000000) return 'Médio Porte';
  return 'Grande Porte';
}

export async function searchByCNPJ(cnpj: string) {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) throw new Error('CNPJ deve ter 14 dígitos');

  const response = await fetch(`${BRASIL_API_BASE}/cnpj/v1/${digits}`, {
    headers: {
      'User-Agent': 'ProjetoCRM/1.0 (Integration; contact@projetocrm.local)',
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    if (response.status === 404) throw new Error('CNPJ não encontrado na base da Receita Federal');
    console.error(`[BrasilAPI Error] Status: ${response.status} ${response.statusText}`);
    throw new Error('Erro ao consultar CNPJ. Tente novamente.');
  }

  const data: any = await response.json();

  return {
    cnpj: formatCNPJ(digits),
    cnpjRaw: digits,
    razaoSocial: data.razao_social || '',
    nomeFantasia: data.nome_fantasia || data.razao_social || '',
    situacao: data.descricao_situacao_cadastral || 'Não informado',
    dataSituacao: data.data_situacao_cadastral || null,
    cnae: data.cnae_fiscal ? `${data.cnae_fiscal} - ${data.cnae_fiscal_descricao}` : '',
    cnaeSecundarios: (data.cnaes_secundarias || []).map((c: any) => `${c.codigo} - ${c.descricao}`),
    endereco: [
      data.logradouro, data.numero, data.complemento,
      data.bairro, data.municipio, data.uf, data.cep
    ].filter(Boolean).join(', '),
    cidade: data.municipio || '',
    uf: data.uf || '',
    cep: data.cep || '',
    telefone: data.ddd_telefone_1 ? `(${data.ddd_telefone_1.substring(0,2)}) ${data.ddd_telefone_1.substring(2)}` : '',
    email: data.email || '',
    capitalSocial: data.capital_social || 0,
    capitalSocialFormatado: data.capital_social
      ? `R$ ${Number(data.capital_social).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      : 'Não informado',
    porte: data.porte || parseSizeByCapital(data.capital_social),
    naturezaJuridica: data.natureza_juridica || '',
    dataAbertura: data.data_inicio_atividade || null,
    qsa: (data.qsa || []).map((s: any) => ({
      nome: s.nome_socio,
      qualificacao: s.qualificacao_socio,
      cpfRepresentante: s.cpf_representante_legal || null,
    })),
  };
}

export async function saveSearch(tenantId: string, userId: string, searchQuery: string, results: any[]) {
  try {
    await query(
      `INSERT INTO prospecting_searches (tenant_id, user_id, search_query, results_count, filters)
       VALUES ($1, $2, $3, $4, $5)`,
      [tenantId, userId, searchQuery, results.length, JSON.stringify({ type: 'cnpj' })]
    );
  } catch {
    // Fail silently — history is non-critical
  }
}

export async function getRecentSearches(tenantId: string, userId: string) {
  try {
    const { rows } = await query(
      `SELECT search_query, results_count, created_at
       FROM prospecting_searches
       WHERE tenant_id = $1 AND user_id = $2
       ORDER BY created_at DESC LIMIT 10`,
      [tenantId, userId]
    );
    return rows;
  } catch {
    return [];
  }
}

export async function addAsLead(tenantId: string, userId: string, companyData: any) {
  const lead = await leadsService.create(tenantId, userId, {
    name: companyData.nomeFantasia || companyData.razaoSocial,
    company: companyData.razaoSocial,
    email: companyData.email || null,
    phone: companyData.telefone || null,
    source: 'prospecting',
    status: 'new',
    customFields: {
      cnpj: companyData.cnpj,
      cnae: companyData.cnae,
      cidade: companyData.cidade,
      uf: companyData.uf,
      porte: companyData.porte,
    },
  });
  return lead;
}
