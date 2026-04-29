# DealHunter AI — Backend

API REST para monitoramento inteligente de preços de e-commerce com scraping, conversão de moedas em tempo real e análise por inteligência artificial.

## Tecnologias
- **Node.js + Express** — Servidor HTTP
- **Prisma + MySQL** — ORM e banco de dados
- **Puppeteer** — Web scraping headless
- **AwesomeAPI** — Conversão USD → BRL em tempo real
- **Google Gemini AI** — Análise de preços e sentimento
- **Socket.io** — Feedback em tempo real via WebSocket
- **CORS** — Comunicação segura com o frontend

##  Endpoints

### Produtos
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/products` | Lista todos os produtos monitorados |
| GET | `/api/products/:id` | Detalhes de um produto com histórico completo |
| POST | `/api/products/scrape` | Dispara nova coleta de preços via Puppeteer |
| GET | `/api/products/:id/analyze` | Análise de IA do produto (preço + sentimento) |

### Health Check
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/` | Verifica se o servidor está online |

##  Fluxo de Dados
1. `POST /scrape` é chamado pelo frontend
2. Puppeteer acessa `fake-ecommerce-five.vercel.app` e extrai produtos
3. AwesomeAPI converte os preços de USD para BRL
4. Prisma salva os dados no MySQL (somente BRL é persistido)
5. Socket.io emite eventos em tempo real para o frontend
6. Histórico de preços é registrado a cada coleta

## 🤖 Análise de IA
A rota `/analyze` usa o **Google Gemini 2.5 Flash** para:
- Analisar a tendência de preços (alta, baixa, estável)
- Gerar recomendação de compra
- Classificar o sentimento das avaliações (positivo, neutro, negativo)

## 🛠️ Como rodar localmente

### Pré-requisitos
- Node.js 18+
- MySQL rodando localmente

### Instalação
```bash
git clone https://github.com/richluizbri/dealhunter-ai
cd dealhunter-ai
npm install
```

### Configuração
Crie um arquivo `.env` na raiz:
```env
DATABASE_URL=mysql://usuario:senha@localhost:3306/dealhunter
GEMINI_API_KEY=sua_chave_aqui
PORT=3001
```

### Banco de dados
```bash
npx prisma db push
```

### Iniciar
```bash
npm run dev
```

O servidor estará disponível em `http://localhost:3001`

##  Deploy
- **Backend:** [Railway](dealhunter-ai-production.up.railway.app)
- **Frontend:** [Vercel](deal-hunter-front.vercel.app)
- **Banco:** MySQL hospedado no Railway

##  Estrutura do Projeto
```
src/
  controllers/     # Gerenciamento de rotas
  services/        # Lógica de negócio
    scrapingService.js   # Puppeteer
    currencyService.js   # Conversão USD→BRL
    productService.js    # Orquestração
    aiService.js         # Google Gemini
  repositories/    # Queries Prisma
prisma/
  schema.prisma    # Modelos do banco
```
