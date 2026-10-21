/* Peças do formulário de inscrição, usadas por api/inscricao.js e api/reenviar.js.
   Duas vias independentes, para nenhuma inscrição se perder:
   1. banco (Supabase, só no servidor): a inscrição e o comprovante ficam guardados primeiro;
   2. e-mail (Gmail SMTP) para a Neuromov, com o comprovante anexado.
   Se o e-mail falhar, a inscrição fica marcada no banco e o reenvio diário tenta de novo.
   O banco mora no projeto Supabase "espaco-crescer", numa pasta só da Neuromov: schema "neuromov"
   (tabela inscricoes) e bucket "neuromov-comprovantes". O esquema está em supabase/schema.sql.
   Variáveis na Vercel: SUPABASE_URL, SUPABASE_SECRET_KEY (ou SUPABASE_SERVICE_ROLE_KEY),
   GMAIL_USER, GMAIL_APP_PASSWORD e INSCRICAO_TO. */
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = (v, n = 200) => String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').trim().slice(0, n);

const ESCOLARIDADE = ['Estudante de Fisioterapia', 'Fisioterapeuta'];
const PAGAMENTO = ['Pix', 'Cartão de crédito (até 4x com juros)'];
const SCHEMA = 'neuromov';
const BUCKET = 'neuromov-comprovantes';
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/heic': 'heic', 'application/pdf': 'pdf' };
const MAX_ARQUIVO = 3.6 * 1024 * 1024; // a Vercel recusa corpo acima de 4,5 MB, e o arquivo chega em base64

/** O tipo de verdade, pelos primeiros bytes: o nome e o tipo que o navegador manda podem mentir. */
function tipoReal(buf) {
  const ascii = (a, b) => buf.toString('latin1', a, b);
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (ascii(0, 8) === '\x89PNG\r\n\x1a\n') return 'image/png';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  if (ascii(0, 4) === 'GIF8') return 'image/gif';
  if (ascii(4, 8) === 'ftyp' && /^(heic|heix|hevc|hevx|mif1|msf1|heim|heis)$/.test(ascii(8, 12))) return 'image/heic';
  if (buf.subarray(0, 1024).includes('%PDF-')) return 'application/pdf';
  return null;
}

/** Confere o que veio do formulário. Devolve { d, arquivo } ou { erro, status }. */
function lerInscricao(b) {
  const d = {
    nome: clean(b.nome, 120),
    email: clean(b.email, 160),
    telefone: clean(b.telefone, 40),
    escolaridade: clean(b.escolaridade, 60),
    pagamento: clean(b.pagamento, 60),
  };
  if (d.nome.length < 3 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email) || d.telefone.replace(/\D/g, '').length < 10 || !ESCOLARIDADE.includes(d.escolaridade) || !PAGAMENTO.includes(d.pagamento)) {
    return { erro: 'invalid', status: 400 };
  }
  let arquivo = null;
  const c = b.comprovante;
  if (c && c.data) {
    const buf = Buffer.from(String(c.data), 'base64');
    if (buf.length > MAX_ARQUIVO) return { erro: 'file-size', status: 413 };
    const tipo = buf.length ? tipoReal(buf) : null;
    if (!tipo) return { erro: 'file-type', status: 400 };
    const base = clean(c.name, 120).replace(/\.[^.]*$/, '').replace(/[^\w.\- ]+/g, '_').trim() || 'comprovante';
    arquivo = { buf, tipo, nome: `${base}.${EXT[tipo]}` };
  }
  if (d.pagamento === 'Pix' && !arquivo) return { erro: 'missing-receipt', status: 400 };
  return { d, arquivo };
}

/* ---------- e-mail ---------- */
// o Google mostra a senha de app em 4 blocos com espaço, e colar na Vercel pode trazer espaço ou quebra de linha
const gmail = () => ({ user: (process.env.GMAIL_USER || '').trim(), pass: (process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '') });
const emailLigado = () => { const g = gmail(); return !!(g.user && g.pass); };
const quando = (iso) => new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });

async function enviarEmail(d, arquivo, criadoEm) {
  const { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD } = gmail();
  const INSCRICAO_TO = (process.env.INSCRICAO_TO || '').trim();
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) throw new Error('email-not-configured');
  const rows = [
    ['Nome completo', d.nome], ['E-mail', d.email], ['Telefone', d.telefone],
    ['Escolaridade', d.escolaridade], ['Pagamento', d.pagamento],
    ['Comprovante', arquivo ? 'em anexo' : (d.pagamento === 'Pix' ? 'faltando' : 'não se aplica (cartão: mandar o link)')],
    ['Inscrição feita em', quando(criadoEm || Date.now())],
  ];
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#2A1A22">
    <h2 style="font-weight:400;margin:0 0 16px">Nova inscrição: Equilíbrio na Prática Clínica</h2>
    <table cellpadding="8" style="border-collapse:collapse">${rows.map(([k, v]) => `<tr><td style="color:#6C5C64;border-bottom:1px solid #eee">${esc(k)}</td><td style="border-bottom:1px solid #eee"><b>${esc(v)}</b></td></tr>`).join('')}</table>
    <p style="color:#6C5C64;font-size:13px;margin-top:18px">Responda este e-mail para falar direto com a pessoa inscrita.</p></div>`;
  const msg = {
    from: `"Inscrições Neuromov" <${GMAIL_USER}>`,
    to: INSCRICAO_TO || GMAIL_USER,
    replyTo: `"${d.nome.replace(/"/g, '')}" <${d.email}>`,
    subject: `Nova inscrição: ${d.nome} (${d.pagamento === 'Pix' ? 'Pix' : 'Cartão'})`,
    text: rows.map(([k, v]) => `${k}: ${v}`).join('\n'),
    html,
    attachments: arquivo ? [{ filename: arquivo.nome, content: arquivo.buf, contentType: arquivo.tipo }] : [],
  };
  // prazos curtos: um Gmail travado não pode segurar a resposta (a inscrição já está no banco)
  const t = nodemailer.createTransport({ service: 'gmail', auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD }, connectionTimeout: 8000, greetingTimeout: 8000, socketTimeout: 15000 });
  let erro;
  for (let i = 0; i < 2; i++) {
    try { await t.sendMail(msg); return; } catch (e) { erro = e; if (i === 0) await new Promise((r) => setTimeout(r, 900)); }
  }
  throw erro;
}

/* ---------- banco (a chave secreta só existe aqui no servidor) ---------- */
const sbUrl = () => (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const sbKey = () => process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const bancoLigado = () => !!(sbUrl() && sbKey());

async function sb(caminho, { method = 'GET', headers = {}, body } = {}) {
  const key = sbKey();
  const h = { apikey: key, ...(key.startsWith('eyJ') ? { authorization: `Bearer ${key}` } : {}), ...headers };
  if (caminho.startsWith('/rest/')) h[method === 'GET' ? 'accept-profile' : 'content-profile'] = SCHEMA;
  const r = await fetch(sbUrl() + caminho, { method, headers: h, body, signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error(`supabase ${r.status} ${method} ${caminho.split('?')[0]}: ${(await r.text()).slice(0, 160)}`);
  if (r.status === 204) return null;
  const tipo = r.headers.get('content-type') || '';
  return tipo.includes('json') ? r.json() : Buffer.from(await r.arrayBuffer());
}
const json = (o) => ({ headers: { 'content-type': 'application/json', prefer: 'return=representation' }, body: JSON.stringify(o) });

/** Impressão do IP sem guardar o IP: serve só para frear quem manda dezenas de inscrições seguidas. */
function ipHash(req) {
  const ip = String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || '').split(',')[0].trim() || 'sem-ip';
  return crypto.createHash('sha256').update(`${ip}|${new Date().toISOString().slice(0, 10)}|neuromov`).digest('hex').slice(0, 32);
}

async function inscricoesRecentes(hash) {
  const desde = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const r = await sb(`/rest/v1/inscricoes?select=id&ip_hash=eq.${hash}&criado_em=gte.${encodeURIComponent(desde)}&limit=10`);
  return r.length;
}

async function guardarArquivo(arquivo) {
  const caminho = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${EXT[arquivo.tipo]}`;
  await sb(`/storage/v1/object/${BUCKET}/${caminho}`, { method: 'POST', headers: { 'content-type': arquivo.tipo, 'x-upsert': 'false' }, body: arquivo.buf });
  return caminho;
}

async function salvarInscricao(linha) {
  const [r] = await sb('/rest/v1/inscricoes', { method: 'POST', ...json(linha) });
  return r;
}

async function marcarEnvio(id, enviado, erro, tentativas) {
  await sb(`/rest/v1/inscricoes?id=eq.${id}`, { method: 'PATCH', ...json({ email_enviado: enviado, erro: erro ? String(erro).slice(0, 300) : null, tentativas, ultima_tentativa: new Date().toISOString() }) });
}

/** E-mails que não saíram: dos últimos 60 dias, no máximo uma tentativa por hora cada. */
async function pendentes() {
  const hora = encodeURIComponent(new Date(Date.now() - 50 * 60 * 1000).toISOString());
  const corte = encodeURIComponent(new Date(Date.now() - 60 * 864e5).toISOString());
  return sb(`/rest/v1/inscricoes?select=*&email_enviado=is.false&criado_em=gt.${corte}&or=(ultima_tentativa.is.null,ultima_tentativa.lt.${hora})&order=criado_em.asc&limit=20`);
}

const baixarArquivo = (caminho) => sb(`/storage/v1/object/${BUCKET}/${caminho}`);

/** Apaga do banco as inscrições e os comprovantes com mais de 180 dias, como diz /privacidade.
    O e-mail da inscrição fica com a Neuromov. */
const RETENCAO_DIAS = 180;
async function apagarAntigas() {
  const corte = encodeURIComponent(new Date(Date.now() - RETENCAO_DIAS * 864e5).toISOString());
  const velhas = await sb(`/rest/v1/inscricoes?select=id,comprovante&criado_em=lt.${corte}&limit=200`);
  if (!velhas.length) return 0;
  const arquivos = velhas.map((r) => r.comprovante).filter(Boolean);
  if (arquivos.length) await sb(`/storage/v1/object/${BUCKET}`, { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prefixes: arquivos }) });
  await sb(`/rest/v1/inscricoes?id=in.(${velhas.map((r) => r.id).join(',')})`, { method: 'DELETE' });
  return velhas.length;
}

module.exports = {
  lerInscricao, tipoReal, enviarEmail, emailLigado, bancoLigado, ipHash, inscricoesRecentes,
  guardarArquivo, salvarInscricao, marcarEnvio, pendentes, baixarArquivo, apagarAntigas,
};
