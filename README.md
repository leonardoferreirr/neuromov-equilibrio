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

- Ameixa e creme, as cores dos stories e do logo.
- Fontes: Poppins (300, 400 e 500) nos títulos e no texto, Playfair Display itálica nos nomes e nos números dos módulos (a mesma linha dos stories). Todas servidas do próprio site.
- Logo vetorizado (`assets/img/logo.svg`) a partir da versão escura. No HTML ele está num `<symbol>` e herda a cor do texto: creme no vinho, ameixa no claro.
- Topo no celular: a foto das duas ocupa a tela inteira e se desfaz no vinho, com o título entrando por cima do degradê. No computador a foto fica na metade direita.
- Barra fixa no celular com o preço e o botão. Ela aparece depois dos botões do topo e some na inscrição e no rodapé.
- Entrada suave dos blocos ao rolar. Sem JS, nada fica escondido.

Lighthouse (local, 20/10/2026): celular 99, computador 100, acessibilidade 100.

## Rodar local

```bash
npx serve -l 5310 .
```
