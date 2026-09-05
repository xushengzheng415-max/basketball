FROM node:20-alpine

WORKDIR /app
COPY --chown=node:node core.js index.js server.js package.json README.md ./
RUN mkdir -p /app/data && chown node:node /app/data

ENV NODE_ENV=production \
    PORT=3400 \
    DATA_DIR=/app/data \
    SERVICE_ENABLED=false \
    SCHEDULER_ENABLED=false \
    AUTO_CREATE_ENABLED=false \
    AUTO_REMIND_ENABLED=false

VOLUME ["/app/data"]
EXPOSE 3400
USER node
CMD ["node", "server.js"]
