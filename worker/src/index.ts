import 'dotenv/config';
import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { Pool } from 'pg';
import nodemailer from 'nodemailer';
import axios from 'axios';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });

const db = new Pool({ connectionString: process.env.DATABASE_URL });

const query = (text: string, params?: any[]) => db.query(text, params);

const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const evolutionBase = process.env.EVOLUTION_API_URL || 'http://evolution-api:8080';
const evolutionKey = process.env.EVOLUTION_API_KEY || '';

async function sendWhatsApp(instance: string, phone: string, text: string) {
  await axios.post(
    `${evolutionBase}/message/sendText/${instance}`,
    { number: phone, text },
    { headers: { apikey: evolutionKey } }
  );
}

console.log('🔧 CRM Worker starting...');

// ── Email Worker ────────────────────────────────────────────────
const emailWorker = new Worker(
  'email',
  async (job) => {
    const { to, subject, html, text } = job.data;
    await mailer.sendMail({
      from: `"CRM" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text,
    });
    console.log(`[Email] Sent to ${to}: ${subject}`);
  },
  { connection }
);

// ── WhatsApp Worker ─────────────────────────────────────────────
const whatsappWorker = new Worker(
  'whatsapp',
  async (job) => {
    const { instance, phone, message, conversationId, tenantId } = job.data;
    await sendWhatsApp(instance, phone, message);

    if (conversationId) {
      await query(
        `INSERT INTO messages (conversation_id, content, direction, channel, status)
         VALUES ($1, $2, 'outbound', 'whatsapp', 'sent')`,
        [conversationId, message]
      );
    }
    console.log(`[WhatsApp] Sent to ${phone} via ${instance}`);
  },
  { connection }
);

// ── Campaign Worker ─────────────────────────────────────────────
const campaignWorker = new Worker(
  'campaigns',
  async (job) => {
    const { campaignId } = job.data;
    const { rows: [campaign] } = await query(
      'SELECT * FROM campaigns WHERE id = $1',
      [campaignId]
    );

    if (!campaign) { console.error(`[Campaign] Not found: ${campaignId}`); return; }

    await query(
      `UPDATE campaigns SET status = 'sending', updated_at = NOW() WHERE id = $1`,
      [campaignId]
    );

    const { rows: contacts } = await query(
      `SELECT DISTINCT l.email, l.phone, l.name
       FROM leads l
       WHERE l.tenant_id = $1 AND l.status != 'converted' AND l.email IS NOT NULL`,
      [campaign.tenant_id]
    );

    let sentCount = 0;
    for (const contact of contacts) {
      try {
        if (campaign.type === 'email' && contact.email) {
          await mailer.sendMail({
            from: `"CRM" <${process.env.SMTP_USER}>`,
            to: contact.email,
            subject: campaign.subject || campaign.name,
            html: campaign.content_html || campaign.content,
            text: campaign.content,
          });
          sentCount++;
        } else if (campaign.type === 'whatsapp' && contact.phone) {
          const { rows: [instance] } = await query(
            `SELECT i.name FROM whatsapp_instances i WHERE i.tenant_id = $1 AND i.status = 'connected' LIMIT 1`,
            [campaign.tenant_id]
          );
          if (instance) {
            await sendWhatsApp(instance.name, contact.phone, campaign.content);
            sentCount++;
          }
        }
      } catch (err: any) {
        console.error(`[Campaign] Failed to send to ${contact.email || contact.phone}:`, err.message);
      }
    }

    await query(
      `UPDATE campaigns SET status = 'sent', sent_count = $1, sent_at = NOW(), updated_at = NOW() WHERE id = $2`,
      [sentCount, campaignId]
    );

    console.log(`[Campaign] ${campaignId} completed: ${sentCount}/${contacts.length} sent`);
  },
  { connection }
);

// ── Automation Worker ───────────────────────────────────────────
const automationWorker = new Worker(
  'automations',
  async (job) => {
    const { automationId, triggerData } = job.data;

    const { rows: [automation] } = await query(
      'SELECT * FROM automations WHERE id = $1 AND is_active = true',
      [automationId]
    );
    if (!automation) return;

    const nodes: any[] = automation.nodes || [];
    const edges: any[] = automation.edges || [];

    const getNextNodes = (nodeId: string) =>
      edges.filter((e: any) => e.source === nodeId).map((e: any) => e.target);

    const startNode = nodes.find((n: any) => n.type === 'trigger');
    if (!startNode) return;

    const processNode = async (nodeId: string) => {
      const node = nodes.find((n: any) => n.id === nodeId);
      if (!node) return;

      try {
        switch (node.type) {
          case 'send_email': {
            const { to, subject, body } = node.data || {};
            if (to || triggerData?.email) {
              await mailer.sendMail({
                from: `"CRM" <${process.env.SMTP_USER}>`,
                to: to || triggerData.email,
                subject: subject || 'Mensagem automática',
                html: body || '',
              });
            }
            break;
          }
          case 'move_opportunity': {
            const { stageId, opportunityId } = node.data || {};
            const oppId = opportunityId || triggerData?.opportunityId;
            if (oppId && stageId) {
              await query(
                'UPDATE opportunities SET stage_id = $1, updated_at = NOW() WHERE id = $2',
                [stageId, oppId]
              );
            }
            break;
          }
          case 'webhook': {
            const { url, method = 'POST' } = node.data || {};
            if (url) {
              await axios({ method, url, data: triggerData });
            }
            break;
          }
          case 'delay': {
            const ms = (node.data?.hours || 0) * 3600000 + (node.data?.minutes || 0) * 60000;
            if (ms > 0) await new Promise((r) => setTimeout(r, Math.min(ms, 30000)));
            break;
          }
        }
      } catch (err: any) {
        console.error(`[Automation] Node ${node.type} failed:`, err.message);
      }

      for (const nextId of getNextNodes(nodeId)) {
        await processNode(nextId);
      }
    };

    for (const nextId of getNextNodes(startNode.id)) {
      await processNode(nextId);
    }

    await query(
      `UPDATE automations SET last_run_at = NOW(), run_count = COALESCE(run_count, 0) + 1 WHERE id = $1`,
      [automationId]
    );

    console.log(`[Automation] ${automationId} executed`);
  },
  { connection }
);

// ── Cadence Worker ──────────────────────────────────────────────
const cadenceWorker = new Worker(
  'cadences',
  async (job) => {
    const { stepId, leadId } = job.data;
    const { rows: [step] } = await query(
      'SELECT cs.*, c.tenant_id FROM cadence_steps cs JOIN cadences c ON c.id = cs.cadence_id WHERE cs.id = $1',
      [stepId]
    );
    if (!step) return;

    const { rows: [lead] } = await query('SELECT * FROM leads WHERE id = $1', [leadId]);
    if (!lead || !lead.email) return;

    if (step.type === 'email') {
      await mailer.sendMail({
        from: `"CRM" <${process.env.SMTP_USER}>`,
        to: lead.email,
        subject: step.subject || 'Mensagem de cadência',
        html: step.body || '',
      });
    }

    console.log(`[Cadence] Step ${stepId} executed for lead ${leadId}`);
  },
  { connection }
);

// ── Billing Worker ──────────────────────────────────────────────
const billingWorker = new Worker(
  'billing',
  async (job) => {
    console.log(`[Billing] Processing job ${job.id}:`, job.name, job.data);
  },
  { connection }
);

[emailWorker, whatsappWorker, campaignWorker, automationWorker, cadenceWorker, billingWorker]
  .forEach((worker) => {
    worker.on('completed', (job) => console.log(`✅ Job completed: ${job.id}`));
    worker.on('failed', (job, err) => console.error(`❌ Job failed: ${job?.id}`, err.message));
  });

console.log('✅ CRM Worker running with queues: email, whatsapp, campaigns, automations, cadences, billing');

process.on('SIGTERM', async () => {
  await Promise.all([
    emailWorker.close(),
    whatsappWorker.close(),
    campaignWorker.close(),
    automationWorker.close(),
    cadenceWorker.close(),
    billingWorker.close(),
  ]);
  await db.end();
  process.exit(0);
});
