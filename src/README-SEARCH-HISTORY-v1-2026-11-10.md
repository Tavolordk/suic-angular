# SPM-1.0 — Integración SearchHistory v1

Contrato: `SPM_Endpoint_Front_SearchHistory_v1_2026-11-10.xlsx`.
Base implementada: `SPM-1.0_src_Perfiles_Consolidados_Person_v2_Implementado.zip`.

## Endpoints

- Nuevo: `GET /api/search/history?page=1&pageSize=18` — sólo historial temporal vigente de la cuenta autenticada, sin usuario/propietario en el query, sin body.
- Existente: `GET {items[].resultsUrl}?page=1&pageSize=18` — abrir búsqueda reciente sin crear una nueva. Ruta relativa validada frente a `searchId`, mismo gateway.
- Existente: `GET /api/search/{searchId}/results/{resultId}` — abrir detalle de tarjeta, también si `kind=ConsolidatedProfile`.
- No se modificó el comportamiento de `POST /api/search`, `POST /api/search/{searchId}/save` ni `/api/saved-searches`.

## Comportamiento en UI

- Panel Historial de la página Búsqueda y panel compartido de otras secciones leen el mismo servicio de historial real; no se muestran ejemplos como búsquedas recientes.
- Se muestran criterios (`inputs`), tipo Person/Vehicle/Weapon, fechas de publicación/vencimiento, conteos y paginación del historial independiente de la paginación de tarjetas.
- Al abrir se utiliza `resultsUrl` validada y se conserva durante las siguientes páginas y la exportación; se restauran los criterios conocidos en el formulario sin ejecutarlos.
- Ante 404/410 en la lectura de resultados se refresca el historial con un mensaje, sin ejecutar automáticamente `POST /api/search`. Ante 503 no se reintenta automáticamente (respeta Retry-After).
- Un historial vacío devuelve cero búsquedas; `counts.consolidated` ausente sigue representando 0.
- Bearer se adjunta por el interceptor existente `authTokenInterceptor`; no se inventan tokens.
- El vencimiento mostrado procede de `expiresAtUtc`; el servidor decide si ya venció, evitando bloquear usuarios con la hora del dispositivo incorrecta.

## Compatibilidad

- Se mantuvieron sin cambios todos los archivos `*.scss`, `*.css`, `*.svg` y otros recursos visuales del ZIP base.
- No se quitaron iconos visuales existentes de los paneles; las filas reutilizan los iconos Font Awesome originales.
- Se mantiene la vista consolidada y sus reglas de solo lectura del ZIP base.

## Pruebas

- `src/app/core/infrastructure/search-api/search-api.service.spec.ts`: HTTP, paginación, apertura segura y sin POST, historial vacío, sin reintentos 503.
- `src/app/features/search/domain/search-history.mapper.spec.ts`: etiquetas y fechas UTC.
- Los archivos TypeScript modificados pasaron comprobación sintáctica independiente.
- La compilación completa y la ejecución de Jasmine/Karma quedan pendientes en el proyecto principal: el ZIP suministrado contiene solamente `src` y no incluye `package.json`, Angular CLI ni `node_modules`.
