FROM node:20-alpine

WORKDIR /app
COPY core.js server.js package.json ./

ENV NODE_ENV=production
ENV PORT=3200
EXPOSE 3200

USER node
CMD ["node", "server.js"]

