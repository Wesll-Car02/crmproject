import { query } from '../../database';
import { config } from '../../config';

// Simple heuristic score (no external API needed)
function calculateLeadScore(lead: any): number {
  let score = 0;
  if (lead.email) score += 10;
  if (lead.phone) score += 10;
  if (lead.company) score += 15;
  if (lead.job_title) score += 5;
  if (lead.source === 'referral') score += 25;
  if (lead.source === 'meta_ads') score += 20;
  if (lead.utm_campaign) score += 10;
  return Math.min(score, 100);
}

export async function scoreLead(leadId: string, tenantId: string) {
  const { rows } = await query(
    'SELECT * FROM leads WHERE id = $1 AND tenant_id = $2',
    [leadId, tenantId]
  );
  const lead = rows[0];
  if (!lead) throw new Error('Lead não encontrado');

  const score = calculateLeadScore(lead);

  await query('UPDATE leads SET score = $1, updated_at = NOW() WHERE id = $2', [score, leadId]);

  return { leadId, score, details: { hasEmail: !!lead.email, hasPhone: !!lead.phone, hasCompany: !!lead.company, source: lead.source } };
}

export async function suggestResponse(conversationId: string, tenantId: string) {
  // Without OpenAI key, return template suggestions
  const openaiKey = config.openai?.apiKey;

  if (!openaiKey) {
    return {
      suggestions: [
        'Olá! Obrigado pelo contato. Como posso ajudá-lo(a) hoje?',
        'Entendo sua situação. Vamos encontrar a melhor solução para você.',
        'Poderia me fornecer mais detalhes para que eu possa ajudá-lo melhor?',
      ],
      source: 'template',
    };
  }

  try {
    // Get last messages from conversation
    const { rows: msgs } = await query(`
      SELECT content, direction FROM messages
      WHERE conversation_id = $1 ORDER BY created_at DESC LIMIT 5
    `, [conversationId]);

    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: openaiKey });

    const history = msgs.reverse().map((m: any) => ({
      role: m.direction === 'inbound' ? 'user' : 'assistant',
      content: m.content,
    }));

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Você é um assistente de vendas brasileiro. Sugira 3 respostas curtas e profissionais para o cliente, em português.' },
        ...history,
        { role: 'user', content: 'Sugira 3 respostas para minha última mensagem. Retorne apenas as 3 sugestões numeradas.' },
      ],
      max_tokens: 300,
    });

    return { suggestions: response.choices[0].message.content?.split('\n').filter(Boolean) || [], source: 'openai' };
  } catch {
    return { suggestions: ['Olá! Como posso ajudá-lo?', 'Entendido. Vou verificar para você.', 'Poderia nos dar mais detalhes?'], source: 'fallback' };
  }
}

export async function summarizeConversation(conversationId: string, tenantId: string) {
  try {
    const { rows } = await query(`
      SELECT m.content, m.direction, m.created_at FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE m.conversation_id = $1 AND c.tenant_id = $2
      ORDER BY m.created_at ASC LIMIT 50
    `, [conversationId, tenantId]);

    if (rows.length === 0) return { summary: 'Sem mensagens para resumir.' };

    const openaiKey = config.openai?.apiKey;
    if (!openaiKey) {
      return { summary: `Conversa com ${rows.length} mensagens. ${rows.filter((m: any) => m.direction === 'inbound').length} do cliente, ${rows.filter((m: any) => m.direction === 'outbound').length} do agente.` };
    }

    const OpenAI = require('openai');
    const openai = new OpenAI({ apiKey: openaiKey });
    const text = rows.map((m: any) => `[${m.direction === 'inbound' ? 'Cliente' : 'Agente'}]: ${m.content}`).join('\n');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Resuma esta conversa de atendimento em 2-3 frases em português.' },
        { role: 'user', content: text },
      ],
      max_tokens: 200,
    });

    return { summary: response.choices[0].message.content };
  } catch {
    return { summary: 'Não foi possível gerar o resumo.' };
  }
}

export async function classifyIntent(text: string) {
  const keywords: Record<string, string[]> = {
    compra: ['comprar', 'adquirir', 'preço', 'valor', 'quanto custa', 'orçamento'],
    suporte: ['problema', 'erro', 'não funciona', 'ajuda', 'dúvida'],
    cancelamento: ['cancelar', 'desistir', 'reembolso', 'estorno'],
    informacao: ['como funciona', 'o que é', 'me explica', 'informação'],
  };

  const lower = text.toLowerCase();
  for (const [intent, kws] of Object.entries(keywords)) {
    if (kws.some(kw => lower.includes(kw))) return { intent, confidence: 0.8 };
  }

  return { intent: 'outros', confidence: 0.5 };
}
