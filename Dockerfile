# Imagem base do Node.js versão 22 (slim = mais leve)
FROM node:22-slim

# Instala o OpenSSL e as dependências necessárias para o Chrome/Puppeteer
RUN apt-get update -y && apt-get install -y \
    openssl \
    chromium \
    libglib2.0-0 \
    libnss3 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia os arquivos de dependências primeiro (otimiza o cache do Docker)
COPY package*.json ./

# Instala as dependências do projeto (sem baixar o Chrome do Puppeteer)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN npm install

# Copia o schema do Prisma e gera o client
COPY prisma ./prisma
RUN npx prisma generate

# Copia o restante do código
COPY . .

# Expõe a porta que o Railway vai usar
EXPOSE 8080

# Comando para iniciar o servidor
CMD ["node", "src/server.js"]