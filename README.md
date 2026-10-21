# Equilíbrio na Prática Clínica · Neuromov

Landing do curso presencial **Equilíbrio na Prática Clínica: avaliação, raciocínio clínico e reabilitação**, da Neuromov (Uberlândia/MG), com Júlia Faria e Nicoly Alves.

HTML, CSS e JS puros num `index.html`, sem build, mais duas funções na Vercel: `api/inscricao.js` (guarda a inscrição no banco e manda por e-mail) e `api/reenviar.js` (reenvio diário).

## De onde veio o conteúdo

- **Legenda do post de lançamento no Instagram:** pergunta de abertura, os 5 módulos, objetivo, data, local, investimento, parcelamento, vagas e a frase de encerramento. O texto foi mantido. Nos módulos, o travessão virou título e descrição.
- **Vídeo de apresentação:** o foco em pacientes idosos e neurológicos e a ideia de "sair de apenas aplicar testes e escalas". O vídeo também está na página (`assets/curso.mp4`, 540x960) e só carrega quando a pessoa clica no play.
- **Formulário antigo do forms.app:** os mesmos 6 campos (nome, e-mail, telefone, escolaridade, forma de pagamento e comprovante do Pix).
- **Stories das professoras:** a formação de cada uma. **Nicoly agora é mestre** (já defendeu), não mestranda. "UFSCAR" foi escrito como a sigla oficial, UFSCar.
- **Fotos:** a foto das duas (`Júlia e Nicole.jpg`) é usada no topo. Os retratos individuais vêm das fotos de cada uma nos stories.

## Inscrição: banco + e-mail

Nenhuma inscrição pode se perder, então o formulário usa duas vias independentes (`api/inscricao.js`, peças em `lib/inscricao.js`):

1. **Banco (Supabase):** a inscrição e o comprovante ficam guardados primeiro, numa pasta só da Neuromov (schema `neuromov`, tabela `inscricoes`, bucket privado `neuromov-comprovantes`). O esquema está em `supabase/schema.sql`.
2. **E-mail (Gmail):** chega para a Neuromov com os dados e o comprovante em anexo. Responder o e-mail fala direto com a pessoa inscrita.

A pessoa vê "Inscrição recebida" se ao menos uma das duas funcionou. Se o e-mail falhar (senha de app revogada, Gmail fora), a inscrição fica marcada no banco e o **reenvio diário** (`api/reenviar.js`, cron da Vercel às 8h de Brasília) manda depois, no máximo uma tentativa por hora cada. O mesmo cron mantém o Supabase grátis acordado (ele pausa depois de 7 dias sem uso).

Na Vercel, em **Settings > Environment Variables**:

| Variável | O que é |
|---|---|
| `SUPABASE_URL` | endereço do projeto Supabase |
| `SUPABASE_SECRET_KEY` | chave secreta do projeto (Settings > API Keys > Secret keys), só no servidor. Aceita também `SUPABASE_SERVICE_ROLE_KEY` |
| `GMAIL_USER` | o Gmail que envia |
| `GMAIL_APP_PASSWORD` | senha de app desse Gmail (precisa da verificação em duas etapas ligada). Trocar a senha do Google revoga a senha de app |
| `INSCRICAO_TO` | para onde vão as inscrições (hoje juliafariafisio@gmail.com). Sem ele, chega no próprio `GMAIL_USER` |
| `CRON_SECRET` | opcional: se existir, só a Vercel consegue chamar o reenvio |

Sem banco e sem Gmail a função responde 503. Variável nova só vale depois de publicar de novo.

**Comprovante:** foto, print (PNG, JPG, WEBP, HEIC) ou PDF. Foto grande é reduzida no próprio celular; se o navegador não abrir a imagem (HEIC no Android), vai a original. Limite de 3 MB para o arquivo original, por causa do limite de 4,5 MB por requisição da Vercel. O servidor confere o tipo pelos primeiros bytes do arquivo, não pelo nome.

**Segurança:** a chave secreta só existe na função; a tabela e o bucket não têm nenhuma permissão para o público. O IP não é guardado (só uma impressão do dia, para frear mais de 5 inscrições em 10 minutos do mesmo lugar). Campo escondido contra robô.

Testes: o roteiro com Supabase e Gmail falsos cobre envio normal, PDF, HEIC, cartão, arquivo disfarçado, arquivo grande, Gmail fora, banco fora, os dois fora, freio e reenvio sem duplicar.

## Chave Pix

`62.933.878/0001-37` (CNPJ válido). O botão "Copiar chave" copia só os números.

## Visual

- Ameixa e creme, as cores dos stories e do logo. Fontes: Poppins (300/400/500) nos títulos e textos, Playfair Display itálica nos nomes e nos números dos módulos, como nos stories. Tudo servido do próprio site.
- Logo vetorizado (`assets/img/logo.svg`), usado num `<symbol>` que herda a cor do texto.
- **Topo, celular:** a foto das duas ocupa a tela e se desfaz no vinho, com o título por cima do degradê.
- **Topo, celular baixo (iPhone SE, Galaxy S8):** a foto fica menor e os espaços mais justos, para o botão aparecer na primeira tela.
- **Topo, computador:** a foto é o fundo da seção inteira, numa versão ampliada com IA (Upscayl, modelo high-fidelity, `hero-hd-1920/2560.webp`). O celular continua com a foto original, que já basta. A imagem fica presa pelo topo (`top:-16.25vw`, começando logo acima do cabelo delas), e a seção cresce o necessário (`min-height: max(100svh, 32.5vw + texto)`) para o texto nunca encostar no rosto. Título e subtítulo ficam numa linha cada, embaixo, num degradê que sobe do vinho. O cabeçalho começa com logo e menu escuros sobre a foto clara e vira vinho com logo creme ao rolar.
- **Abertura:**
  - Celular: título, vídeo e texto, nessa ordem.
  - Computador: título em 3 linhas no topo do vídeo e o texto terminando na base dele.
  - A frase "E, principalmente…" e a legenda sobre o vídeo saíram a pedido.
- **Módulos:** o título fica parado e os cards sobem um por cima do outro (`position: sticky`), no celular e no computador.
- **Professoras:** recortadas com o Vision da Apple das fotos individuais dos stories (`julia-recorte-v2.webp`, `nicoly-recorte-v2.webp`). Elas ficam em pé sobre uma linha, na mesma escala, e o nome e a formação começam na mesma altura.
- **Inscrição no computador:** título e texto centralizados, formulário em duas colunas no mesmo quadro (dados pessoais à esquerda, escolaridade e pagamento à direita) para caber na tela de um notebook.
- **Botões:** todos dizem "Garantir minha vaga", em todas as seções. No celular há também uma barra fixa com o preço.
- **Ícone da aba:**
  - `favicon.svg` troca de cor com o tema do navegador: ameixa no claro, creme no escuro (`prefers-color-scheme` dentro do SVG). Segue o tema claro/escuro do sistema ou do Chrome. Um tema colorido personalizado do Chrome não é detectável.
  - O Safari não usa SVG e fica com os PNGs (fundo ameixa).

- **Rodapé no celular:** "O curso" e "Contato" lado a lado, em duas colunas.

Lighthouse (no ar, 20/10/2026): celular 99, computador 100, acessibilidade 100.

Conferido em 11 tamanhos de celular: Galaxy Fold fechado, Galaxy S8, Galaxy S20 a S24, iPhone SE, iPhone mini, Galaxy S23 Ultra, iPhone 13/14, iPhone 15/16 Pro, Pixel/Galaxy A, iPhone 13 Pro Max e iPhone 15/16 Pro Max. Nenhum vaza para o lado, os botões não quebram linha e o botão do topo aparece na primeira tela em todos.

**Cache das imagens:** a pasta `assets/` fica guardada no celular por 7 dias. Para trocar uma imagem, salve com outro nome (ex.: `-v3.webp`) e atualize o HTML. Se usar o mesmo nome, quem já visitou continua vendo a antiga.

Rodapé: WhatsApp (34) 99945-9639 só como contato, ao lado do Instagram. Não é botão de conversão.

## Rodar local

```bash
npx serve -l 5310 .
```
