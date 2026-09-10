# Despliegue SSR Front

## 1. Construir el TAR en Windows

Desde la raiz del proyecto:

```powershell
.\build-docker.ps1 `
  -Version "2.1.0" `
  -GatewayUrl "http://10.237.3.42:8081" `
  -IntelligenceApiUrl "http://10.237.3.42:8080"
```

El script crea `ssr-front_2.1.0.tar` y un `.env`.

## 2. Copiar al servidor

Copia al mismo directorio del servidor:

- `ssr-front_2.1.0.tar`
- `docker-compose.yml`
- `.env`

## 3. Cargar y levantar

```bash
docker load -i ssr-front_2.1.0.tar
docker compose up -d
docker compose ps
docker logs -f ssr-front
```

El frontend queda publicado por defecto en el puerto `3500` del servidor.

## 4. Cambiar gateway o API IA SIN reconstruir el TAR

Edita `.env`:

```dotenv
GATEWAY_URL=http://10.237.9.99:8081
INTELLIGENCE_API_URL=http://10.237.9.99:8080
```

Luego:

```bash
docker compose up -d --force-recreate
```

El contenedor genera `runtime-config.js` al arrancar, por lo que ambas URLs nuevas llegan al navegador sin recompilar Angular.

IMPORTANTE: `INTELLIGENCE_API_URL` debe ser una URL alcanzable desde el navegador del usuario. Si el frontend se abre desde otra PC, no uses `127.0.0.1` para la API IA salvo que la API realmente se ejecute en esa misma PC.

## 5. Comandos utiles

```bash
docker compose down
docker compose up -d
docker compose restart
docker logs --tail 100 ssr-front
```
