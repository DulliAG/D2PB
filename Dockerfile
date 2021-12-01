FROM node:alpine

WORKDIR /var/www/DockerDota2PatchBot

Copy . .

Run npm i

CMD ["npm", "start"]