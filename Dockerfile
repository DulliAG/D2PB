FROM node:alpine

LABEL org.opencontainers.image.source https://github.com/DulliAG/Dota2PatchBot

WORKDIR /usr/src/dota2patchbot/

ARG NPM_TOKEN
COPY .npmrc .npmrc
COPY package*.json ./

RUN npm install
RUN rm -f .npmrc

COPY . .

CMD ["npm", "start"]