/* Recebe a inscrição do formulário e manda por e-mail (Gmail SMTP).
   Variáveis na Vercel: GMAIL_USER, GMAIL_APP_PASSWORD (senha de app do Google)
   e, se o destino for outro e-mail, INSCRICAO_TO. Sem elas, responde 503. */
const nodemailer = require('nodemailer');

const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clean = (v, n = 200) => String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').trim().slice(0, n);

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false }); }

  const { GMAIL_USER, GMAIL_APP_PASSWORD, INSCRICAO_TO } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) return res.status(503).json({ ok: false, error: 'email-not-configured' });

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  b = b || {};
  if (b.site) return res.status(200).json({ ok: true }); // robô preencheu o campo escondido

  const d = {
    nome: clean(b.nome, 120),
    email: clean(b.email, 160),
    telefone: clean(b.telefone, 40),
    escolaridade: clean(b.escolaridade, 60),
    pagamento: clean(b.pagamento, 60),
  };
  const ESC = ['Estudante de Fisioterapia', 'Fisioterapeuta'];
  const PAG = ['Pix', 'Cartão de crédito (até 4x com juros)'];
  if (d.nome.length < 3 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email) || d.telefone.replace(/\D/g, '').length < 10 || !ESC.includes(d.escolaridade) || !PAG.includes(d.pagamento)) {
    return res.status(400).json({ ok: false, error: 'invalid' });
  }

  const attachments = [];
  const c = b.comprovante;
  if (c && c.data) {
    const type = clean(c.type, 80);
    if (!/^(image\/(jpeg|png|webp|heic|heif|gif)|application\/pdf)$/.test(type)) return res.status(400).json({ ok: false, error: 'file-type' });
    const buf = Buffer.from(String(c.data), 'base64');
    if (buf.length > 3.6 * 1024 * 1024) return res.status(413).json({ ok: false, error: 'file-size' });
    attachments.push({ filename: clean(c.name, 120).replace(/[^\w.\- ]+/g, '_') || 'comprovante', content: buf, contentType: type });
  }
  if (d.pagamento === 'Pix' && !attachments.length) return res.status(400).json({ ok: false, error: 'missing-receipt' });

  const rows = [
    ['Nome completo', d.nome], ['E-mail', d.email], ['Telefone', d.telefone],
    ['Escolaridade', d.escolaridade], ['Pagamento', d.pagamento],
    ['Comprovante', attachments.length ? 'em anexo' : (d.pagamento === 'Pix' ? 'faltando' : 'não se aplica (cartão: mandar o link)')],
  ];
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;color:#2A1A22">
    <h2 style="font-weight:400;margin:0 0 16px">Nova inscrição: Equilíbrio na Prática Clínica</h2>
    <table cellpadding="8" style="border-collapse:collapse">${rows.map(([k, v]) => `<tr><td style="color:#6C5C64;border-bottom:1px solid #eee">${esc(k)}</td><td style="border-bottom:1px solid #eee"><b>${esc(v)}</b></td></tr>`).join('')}</table>
    <p style="color:#6C5C64;font-size:13px;margin-top:18px">Responda este e-mail para falar direto com a pessoa inscrita.</p></div>`;
  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n');

  try {
    const t = nodemailer.createTransport({ service: 'gmail', auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD } });
    await t.sendMail({
      from: `"Inscrições Neuromov" <${GMAIL_USER}>`,
      to: INSCRICAO_TO || GMAIL_USER,
      replyTo: `"${d.nome.replace(/"/g, '')}" <${d.email}>`,
      subject: `Nova inscrição: ${d.nome} (${d.pagamento === 'Pix' ? 'Pix' : 'Cartão'})`,
      text, html, attachments,
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('inscricao', e && e.message);
    return res.status(502).json({ ok: false, error: 'send-failed' });
  }
};
