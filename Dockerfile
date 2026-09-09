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
ENV DEFAULT_GATEWAY_URL=$DEFAULT_GATEWAY_URL

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

ARG DEFAULT_GATEWAY_URL=http://10.237.3.42:8081
ENV DEFAULT_GATEWAY_URL=$DEFAULT_GATEWAY_URL

EXPOSE 8080

CMD ["npm", "start"]