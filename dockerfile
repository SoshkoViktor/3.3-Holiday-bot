FROM node:20.19.4

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

HEALTHCHECK NONE

CMD ["node", "index.js"]
