# Equilíbrio na Prática Clínica · Neuromov

Landing do curso presencial **Equilíbrio na Prática Clínica: avaliação, raciocínio clínico e reabilitação**, da Neuromov (Uberlândia/MG), com Júlia Faria e Nicoly Alves.

HTML, CSS e JS puros num `index.html`, sem build, mais uma função na Vercel (`api/inscricao.js`) que manda as inscrições por e-mail.

## De onde veio o conteúdo

- **Legenda do post de lançamento no Instagram:** pergunta de abertura, os 5 módulos, objetivo, data, local, investimento, parcelamento, vagas e a frase de encerramento. O texto foi mantido. Nos módulos, o travessão virou título e descrição.
- **Vídeo de apresentação:** o foco em pacientes idosos e neurológicos e a ideia de "sair de apenas aplicar testes e escalas". O vídeo também está na página (`assets/curso.mp4`, 540x960) e só carrega quando a pessoa clica no play.
- **Formulário antigo do forms.app:** os mesmos 6 campos (nome, e-mail, telefone, escolaridade, forma de pagamento e comprovante do Pix).
- **Stories das professoras:** a formação de cada uma. **Nicoly agora é mestre** (já defendeu), não mestranda. "UFSCAR" foi escrito como a sigla oficial, UFSCar.
- **Fotos:** a foto das duas (`Júlia e Nicole.jpg`) é usada no topo e recortada para os retratos individuais.

## Inscrição por e-mail (falta configurar)

O formulário envia para `/api/inscricao`, que manda um e-mail pelo Gmail com os dados e o comprovante do Pix em anexo. A resposta ao e-mail vai direto para a pessoa inscrita.

Na Vercel, em **Settings > Environment Variables**:

| Variável | O que é |
|---|---|
| `GMAIL_USER` | o Gmail que vai enviar (ex.: a conta da Neuromov) |
| `GMAIL_APP_PASSWORD` | senha de app do Google dessa conta (precisa da verificação em duas etapas ligada) |
| `INSCRICAO_TO` | opcional: outro e-mail para receber as inscrições. Sem ele, chega no próprio `GMAIL_USER` |

**Sem essas variáveis o formulário não envia** (a função responde 503 e a página mostra a mensagem de erro). Configurar antes de colocar o link na bio.

Comprovante: foto grande é reduzida no próprio celular antes do envio. PDF tem limite de 3 MB, por causa do limite de 4,5 MB por requisição da Vercel.

## Chave Pix

`62.933.878/0001-37` (CNPJ válido). O botão "Copiar chave" copia só os números.

## Visual

- Ameixa e creme, as cores dos stories e do logo. Fontes: Poppins (300/400/500) nos títulos e textos, Playfair Display itálica nos nomes e nos números dos módulos, como nos stories. Tudo servido do próprio site.
- Logo vetorizado (`assets/img/logo.svg`), usado num `<symbol>` que herda a cor do texto.
- **Topo, celular:** a foto das duas ocupa a tela e se desfaz no vinho, com o título por cima do degradê.
- **Topo, computador:** a foto é o fundo da seção inteira. A imagem fica presa pelo topo (`top:-16.25vw`, começando logo acima do cabelo delas), e a seção cresce o necessário (`min-height: max(100svh, 32.5vw + texto)`) para o texto nunca encostar no rosto. Título e subtítulo ficam numa linha cada, embaixo, num degradê que sobe do vinho. O cabeçalho começa com logo e menu escuros sobre a foto clara e vira vinho com logo creme ao rolar.
- **Abertura:**
  - Celular: título, vídeo e texto, nessa ordem.
  - Computador: título em 3 linhas no topo do vídeo e o texto terminando na base dele.
  - A frase "E, principalmente…" e a legenda sobre o vídeo saíram a pedido.
- **Módulos:** o título fica parado e os cards sobem um por cima do outro (`position: sticky`), no celular e no computador.
- **Professoras:** recortadas da foto das duas com o Vision da Apple. O recorte devolve as duas juntas, e a separação foi feita à mão na linha onde o ombro de uma encontra o da outra. Elas ficam em pé sobre uma linha, na mesma escala, e o nome e a formação começam na mesma altura.
- **Inscrição no computador:** título e texto centralizados, formulário em duas colunas no mesmo quadro (dados pessoais à esquerda, escolaridade e pagamento à direita) para caber na tela de um notebook.
- **Botões:** todos dizem "Garantir minha vaga", em todas as seções. No celular há também uma barra fixa com o preço.
- **Ícone da aba:**
  - `favicon.svg` troca de cor com o tema do navegador: ameixa no claro, creme no escuro (`prefers-color-scheme` dentro do SVG). Segue o tema claro/escuro do sistema ou do Chrome. Um tema colorido personalizado do Chrome não é detectável.
  - O Safari não usa SVG e fica com os PNGs (fundo ameixa).

Lighthouse (local, 20/10/2026): celular 99, computador 100, acessibilidade 100.

Rodapé: WhatsApp (34) 99945-9639 só como contato, ao lado do Instagram. Não é botão de conversão.

## Rodar local

```bash
npx serve -l 5310 .
```
