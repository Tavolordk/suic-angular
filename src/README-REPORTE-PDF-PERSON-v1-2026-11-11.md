# SPM Front | Integración del reporte PDF Person (11/11/2026)

## Alcance

Implementado el contrato `SPM_Endpoints_Front_Reporte_PDF_Person_v1_2026-11-11.xlsx` y los esquemas `PersonReportReceipt`, `PersonReportStatusResponse` y `PersonReportFileInfo` del Swagger `Spm.Engine` v1.

- **Person temporal (nueva búsqueda, historial reciente, pivote temporal):** usa REP-02, REP-03 y REP-04 del Motor. No recorre las páginas del navegador, no concatena tarjetas y no impone el límite local de 500 registros.
- **Vehicle, Weapon y búsqueda guardada:** conservan la exportación PDF local existente. El contrato entregado excluye las búsquedas guardadas y las entidades no Person.
- **Autorización:** el interceptor global agrega `Authorization: Bearer`. No se guardan tokens ni se generan enlaces públicos al PDF.

## Archivos

- `app/core/infrastructure/search-api/person-report-api.models.ts`: contratos tipados del Motor.
- `app/core/infrastructure/search-api/person-report-api.service.ts`: métodos HTTP de REP-02/03/04.
- `app/core/infrastructure/search-api/person-report-api.service.spec.ts`: pruebas del contrato.
- `app/features/search/pages/search-page/search-page.ts`, `.html`, `.scss`: generación, consulta de estado, progreso, mensajes y descarga.

## Proceso del frontend

1. Ejecutar una búsqueda Person o abrir una vigente desde el historial reciente para disponer de `searchId`.
2. Pulsar **Generar PDF**: `POST /api/search/{searchId}/reports/general`, sin body. El resultado HTTP `202` sólo devuelve el `reportJobId`.
3. Consultar `GET /api/reports/{reportJobId}` cada 3 segundos sin solapamiento. Se admiten estados en espera `Queued`, `Delivering`, `RetryScheduled`, `Accepted`, `Processing`.
4. Sólo si `status === 'Completed'` y `file.available === true` aparece **Descargar PDF**.
5. Descargar desde `GET /api/reports/{reportJobId}/file` como Blob, comprobando tipo MIME y firma `%PDF-`, y usar `file.fileName` saneado como nombre de archivo.

No se consulta `/internal/report-datasets`, no se llama directamente al generador PDF ni se necesita Redis desde el frontend.

## Manejo de errores y ciclo de vida

- Se previenen dobles solicitudes; `reused` no se interpreta como archivo listo.
- Se detiene el polling al salir de la vista, al cambiar la búsqueda o identidad, ante estados `Failed` / `Expired`, o al agotarse un máximo de 120 consultas; el usuario puede volver a consultar el estado sin repetir POST.
- Ante 502, 503, 504 o pérdida de red se reintenta la consulta de estado un máximo de cuatro veces con espera creciente; no se dispara un POST nuevo por errores de consulta.
- Al generar: 404/410 avisa búsqueda expirada (recarga historial), 409 avisa búsqueda vacía/conflicto, 422 avisa entidad incorrecta.
- Al descargar: 409 `REPORT_FILE_NOT_READY` consulta nuevamente REP-03; 410 `REPORT_FILE_EXPIRED` informa vencimiento. Errores binarios con JSON se interpretan, sin guardarlos como PDF.
- Se revisan `accessExpiresAtUtc` y `file.availableUntilUtc` antes de descargar.

## Configuración y despliegue

Los endpoints siguen `SEARCH_API_BASE_URL` de la aplicación, configurado con `GATEWAY_URL` y terminación `/api` (actualmente frontend dirigido a puerto `8081`). La referencia de pruebas del contrato identifica al **Motor en `8082`**. **Confirmar que el Gateway del ambiente publique o reenvíe estas tres rutas hacia el Motor**, o configurar un proxy de backend equivalente, antes de ejecutar QA. No se cambió la URL base del resto de los módulos ni se insertó una IP de pruebas en el código del nuevo servicio. Evitar llamadas directas del navegador al puerto de Motor sin validar CORS/autenticación.

## Pruebas sugeridas

1. Buscar Person con más de 18 coincidencias: generar y verificar que no se hace petición de todas las páginas desde el frontend.
2. Verificar en Network un POST con body vacío y `202`, seguido de GET de estado con `reportJobId` (no `datasetId`).
3. Validar que el botón de descarga no aparece si el reporte está en cola, procesando, fallido o `Completed` con `file.available=false`.
4. En Completed, descargar y verificar `Content-Type: application/pdf`, archivo válido y nombre del API.
5. Abrir una búsqueda reciente desde historial y generar sin repetir `POST /api/search`.
6. Forzar 409 `REPORT_FILE_NOT_READY`, 410 `REPORT_FILE_EXPIRED`, y 503 transitorio; comprobar manejo visual y reintentos acotados.
7. Cambiar a búsqueda guardada o entidad Vehicle/Weapon y verificar que se conserva el flujo local original.

**Verificación disponible:** se realizó análisis de sintaxis TypeScript de los archivos nuevos/modificados. El ZIP de entrada contiene únicamente `src/`, sin `package.json`, Angular CLI ni dependencias, por lo que no es posible correr `ng build` o `ng test` sobre ese paquete de manera aislada. Para compilación y tests completos, incorporar `src/` al proyecto Angular original.
