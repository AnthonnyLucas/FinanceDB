# Usa a imagem oficial do Node.js LTS (v22 para alinhar com os docs manuais)
FROM node:22-alpine

# Define o diretório de trabalho dentro do container
WORKDIR /app

# Copia os arquivos de dependência do backend
COPY backend/package*.json ./backend/

# Instala as dependências do backend
RUN cd backend && npm install

# Copia o código do backend e frontend
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Expõe a porta do servidor
EXPOSE 3000

# Adiciona um script de inicialização para criar o .env do backend se não existir (apenas para fallback, pois o docker-compose já passa via env vars)
RUN echo 'DB_HOST=db\nDB_PORT=5432\nDB_NAME=financeiro_pessoal\nDB_USER=postgres\nDB_PASSWORD=postgres123\nJWT_SECRET=financedb_admin_8k3m9x2p7w_secret_2025\nADMIN_EMAIL=Admin_DB@gmail.com\nADMIN_PASSWORD=AdminDB123\nPORT=3000' > ./backend/.env

# Comando para iniciar o servidor
CMD ["node", "backend/server.js"]
