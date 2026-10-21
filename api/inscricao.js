/* Recebe a inscrição do formulário. Guarda primeiro no banco (Supabase) e depois manda o e-mail
   (Gmail SMTP) com o comprovante. Responde "ok" se ao menos uma das duas vias funcionou: o que o
   e-mail não levou, o reenvio diário (api/reenviar.js) leva. Detalhes e variáveis em lib/inscricao.js. */
const L = require('../lib/inscricao');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false }); }

  const banco = L.bancoLigado(), email = L.emailLigado();
  if (!banco && !email) return res.status(503).json({ ok: false, error: 'not-configured' });

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  b = b || {};
  if (b.site) return res.status(200).json({ ok: true }); // robô preencheu o campo escondido

  const v = L.lerInscricao(b);
  if (v.erro) return res.status(v.status).json({ ok: false, error: v.erro });
  const { d, arquivo } = v;

  // freio para quem dispara dezenas de inscrições do mesmo lugar (se o banco não responder, não trava ninguém)
  const ip = L.ipHash(req);
  if (banco) {
    try { if ((await L.inscricoesRecentes(ip)) >= 5) return res.status(429).json({ ok: false, error: 'too-many' }); }
    catch (e) { console.error('inscricao limite', e.message); }
  }

  let linha = null;
  if (banco) {
    try {
      const comprovante = arquivo ? await L.guardarArquivo(arquivo) : null;
      linha = await L.salvarInscricao({ ...d, comprovante, comprovante_nome: arquivo ? arquivo.nome : null, comprovante_tipo: arquivo ? arquivo.tipo : null, ip_hash: ip });
    } catch (e) { console.error('inscricao banco', e.message); }
  }

  let enviado = false, erro = 'email-not-configured';
  if (email) {
    try { await L.enviarEmail(d, arquivo, linha && linha.criado_em); enviado = true; erro = null; }
    catch (e) { erro = e.message; console.error('inscricao email', e.message); }
  }
  // sem Gmail configurado não conta tentativa: o reenvio manda assim que ele existir
  if (linha && email) {
    try { await L.marcarEnvio(linha.id, enviado, erro, 1); } catch (e) { console.error('inscricao marca', e.message); }
  }

  if (linha || enviado) return res.status(200).json({ ok: true });
  return res.status(502).json({ ok: false, error: 'send-failed' });
};
