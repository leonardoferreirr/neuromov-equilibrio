/* Reenvio diário (cron da Vercel, ver vercel.json): manda por e-mail as inscrições que ficaram só no
   banco. Também mantém o projeto do Supabase acordado (o plano grátis pausa após 7 dias sem uso).
   Pode ser chamado por qualquer um sem risco: só manda e-mail para a Neuromov, no máximo uma vez por
   hora por inscrição, e a resposta tem só contagens. */
const L = require('../lib/inscricao');

module.exports = async (req, res) => {
  if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) return res.status(401).json({ ok: false });
  if (!L.bancoLigado()) return res.status(200).json({ ok: true, banco: false });

  let lista;
  try { lista = await L.pendentes(); } catch (e) { console.error('reenviar lista', e.message); return res.status(502).json({ ok: false }); }
  if (!L.emailLigado()) return res.status(200).json({ ok: true, pendentes: lista.length, enviados: 0 });

  let enviados = 0;
  for (const r of lista) {
    let erro = null;
    try {
      const arquivo = r.comprovante ? { buf: await L.baixarArquivo(r.comprovante), tipo: r.comprovante_tipo, nome: r.comprovante_nome || 'comprovante' } : null;
      await L.enviarEmail(r, arquivo, r.criado_em);
      enviados++;
    } catch (e) { erro = e.message; console.error('reenviar email', r.id, e.message); }
    try { await L.marcarEnvio(r.id, !erro, erro, (r.tentativas || 0) + 1); } catch (e) { console.error('reenviar marca', e.message); }
  }
  return res.status(200).json({ ok: true, pendentes: lista.length, enviados });
};
