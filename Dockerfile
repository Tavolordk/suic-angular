# =========================
# BUILD
# =========================
FROM node:24.11.0-alpine AS build

WORKDIR /app

RUN npm install -g npm@11.6.1

COPY package*.json ./

RUN npm install

COPY . .

ARG DEFAULT_GATEWAY_URL=http://10.237.3.42:8081
ARG DEFAULT_INTELLIGENCE_API_URL=http://127.0.0.1:8080
ENV DEFAULT_GATEWAY_URL=$DEFAULT_GATEWAY_URL
ENV DEFAULT_INTELLIGENCE_API_URL=$DEFAULT_INTELLIGENCE_API_URL

RUN npm run build


# =========================
# RUNTIME
# =========================
FROM node:24.11.0-alpine AS runtime

WORKDIR /app

RUN npm install -g npm@11.6.1

COPY package*.json ./

RUN npm install --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ARG DEFAULT_GATEWAY_URL=http://10.237.3.42:8081
ARG DEFAULT_INTELLIGENCE_API_URL=http://127.0.0.1:8080
ENV DEFAULT_GATEWAY_URL=$DEFAULT_GATEWAY_URL
ENV DEFAULT_INTELLIGENCE_API_URL=$DEFAULT_INTELLIGENCE_API_URL

EXPOSE 4000

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "dist/suic-angular/server/server.mjs"]
