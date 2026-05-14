FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --production

COPY src/ ./src/

RUN mkdir -p uploads generated-pdfs

EXPOSE 4000

CMD ["node", "src/index.js"]
