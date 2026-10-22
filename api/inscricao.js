/* Recebe a inscrição do formulário. Guarda primeiro no banco (Supabase) e depois manda o e-mail
   (Gmail SMTP) com o comprovante. Responde "ok" se ao menos uma das duas vias funcionou: o que o
   e-mail não levou, o reenvio diário (api/reenviar.js) leva. Detalhes e variáveis em lib/inscricao.js. */
const L = require('../lib/inscricao');

// o formulário também envia pelo endereço da Vercel quando o domínio próprio falha: libera só o próprio site
const ORIGENS = ['https://www.neuromovfisio.com.br', 'https://neuromovfisio.com.br', 'https://neuromovfisio.vercel.app'];

module.exports = async (req, res) => {
  const origem = req.headers.origin;
  if (ORIGENS.includes(origem)) { res.setHeader('Access-Control-Allow-Origin', origem); res.setHeader('Vary', 'Origin'); }
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST'); res.setHeader('Access-Control-Allow-Headers', 'content-type'); res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false }); }

  const banco = L.bancoLigado(), email = L.emailLigado();
  if (!banco && !email) return res.status(503).json({ ok: false, error: 'not-configured' });

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  b = b || {};

  // o navegador conta o que falhou antes desta tentativa (só códigos, sem dado pessoal): aparece nos logs da Vercel
  if (Array.isArray(b.falhas) && b.falhas.length) console.log('inscricao: chegou depois de falhar no navegador', JSON.stringify(b.falhas.slice(0, 5)).slice(0, 200));
  const chave = typeof b.chave === 'string' ? b.chave.slice(0, 40) : '';

  const v = L.lerInscricao(b);
  if (v.erro) { console.log('inscricao recusada', v.erro); return res.status(v.status).json({ ok: false, error: v.erro }); }
  const { d, arquivo, avisos } = v;
  // campo escondido preenchido costuma ser robô, mas o preenchimento automático do celular também faz isso:
  // a inscrição entra do mesmo jeito, com aviso
  if (b.site) avisos.push('campo escondido preenchido (pode ser robô)');

  // a mesma inscrição repetida pelo navegador (a primeira chegou, a resposta se perdeu): não manda de novo
  if (banco && chave) {
    try { if (await L.jaRecebida(chave)) return res.status(200).json({ ok: true }); }
    catch (e) { console.error('inscricao chave', e.message); }
  }

  // freio para quem dispara dezenas de inscrições do mesmo lugar (se o banco não responder, não trava ninguém)
  const ip = L.ipHash(req);
  if (banco) {
    try { if ((await L.inscricoesRecentes(ip)) >= 5) { console.log('inscricao freada'); return res.status(429).json({ ok: false, error: 'too-many' }); } }
    catch (e) { console.error('inscricao limite', e.message); }
  }

  let linha = null;
  if (banco) {
    try {
      const comprovante = arquivo ? await L.guardarArquivo(arquivo) : null;
      linha = await L.salvarInscricao({ ...d, comprovante, comprovante_nome: arquivo ? arquivo.nome : null, comprovante_tipo: arquivo ? arquivo.tipo : null, ip_hash: ip, chave: /^[a-z0-9]{6,40}$/.test(chave) ? chave : null, avisos: avisos.length ? avisos.join('; ') : null });
    } catch (e) { console.error('inscricao banco', e.message); }
  }

  let enviado = false, erro = 'email-not-configured';
  if (email) {
    try { await L.enviarEmail(d, arquivo, linha && linha.criado_em, avisos); enviado = true; erro = null; }
    catch (e) { erro = e.message; console.error('inscricao email', e.message); }
  }
  // sem Gmail configurado não conta tentativa: o reenvio manda assim que ele existir
  if (linha && email) {
    try { await L.marcarEnvio(linha.id, enviado, erro, 1); } catch (e) { console.error('inscricao marca', e.message); }
  }

  console.log('inscricao', JSON.stringify({ banco: !!linha, email: enviado, avisos: avisos.length, arquivo: arquivo ? arquivo.tipo : null }));
  if (linha || enviado) return res.status(200).json({ ok: true });
  return res.status(502).json({ ok: false, error: 'send-failed' });
};
