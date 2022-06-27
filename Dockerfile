FROM node:alpine

LABEL org.opencontainers.image.source https://github.com/DulliAG/D2PB

WORKDIR /usr/src/d2pb/

COPY package*.json ./

RUN --mount=type=secret,id=npm,target=.npmrc npm install

COPY . .

CMD ["npm", "start"]