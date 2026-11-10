# Integración SPM — Búsquedas guardadas (contrato v1.1, 09/11/2026)

Se han agregado **cuatro endpoints reales** en `app/core/infrastructure/search-api/search-api.service.ts`, a través del mismo Gateway configurado actualmente. El `Authorization: Bearer` continúa a cargo del interceptor existente.

1. `POST /api/search/{searchId}/save` — guarda la búsqueda completa **bajo demanda** y sin body. Solo se muestra confirmación cuando `success=true`; contempla `repeated` y muestra `retainUntilUtc` real.
2. `GET /api/saved-searches/{searchId}/results?page=1&pageSize=18` — recupera resultados guardados, incluida la paginación, sin volver a consultar fuentes.
3. `GET /api/saved-searches/{searchId}/results/{resultId}` — carga la ficha histórica, evidencias y vínculos.
4. `POST /api/saved-searches/{searchId}/results/{resultId}/links/{linkId}/pivot?pageSize=18` — crea una búsqueda **hija temporal** usando el `linkId` retornado por el detalle histórico. Body: `options.includeTrace=false`, `options.includeContextualCandidates=true`. Una hija con cero coincidencias sigue siendo válida y no se guarda automáticamente.

## Interfaz

- La pantalla **Búsqueda** muestra el botón **Guardar búsqueda** para las búsquedas exitosas, incluso si no hay coincidencias. Ya no se presenta el marcador anterior por tarjeta como si fuera un guardado remoto.
- La sección **Búsquedas guardadas** permite consultar las referencias creadas en este navegador, además de abrir una búsqueda por su `searchId` original. Los IDs y la fecha de retención se almacenan localmente **por cuenta autenticada**, sin guardar evidencias, nombres ni tokens. El servidor sigue siendo responsable de la autorización y de la conservación real.
- La paginación, exportación PDF y el detalle de una búsqueda abierta en modo histórico utilizan el GET histórico, sin confundirse con los GET temporales de Search.
- Desde la ficha histórica puede iniciarse una búsqueda temporal por un vínculo de tipo Persona, Vehículo o Arma que contenga un `linkId` real. Permite regresar al detalle del padre.
- **Consolidación histórica deshabilitada** en el front: está explícitamente fuera del contrato actual y depende de la futura T1-03.
- Los endpoints temporales originales de búsqueda y pivoteo siguen intactos.

## Limitaciones del contrato y del entorno

- **No existe endpoint para listar todas las búsquedas guardadas del usuario**: las referencias visibles son solo las que se guardaron desde este navegador y cuenta. Para otros casos hay apertura por UUID. No se simula un listado de servidor.
- El backend debe tener habilitadas las funciones de guardado y recuperación históricas. El pivoteo histórico requiere adicionalmente `HistoricalActionsEnabled`.
- La conservación se muestra usando `retainUntilUtc` retornado: el front no calcula ni envía propietario ni retención.
- Para validar la compilación y las pruebas Jasmine, integrar este `src` en el repositorio Angular completo con su `package.json`, `angular.json`, dependencias y configuración existentes. El ZIP entregado contiene únicamente `src`, igual que el original.

## Pruebas agregadas

`app/core/infrastructure/search-api/saved-search-api.service.spec.ts`: rutas, verbos, query params, body de guardado y pivote, `repeated`, detalles, hijo temporal vacío, y `success=false`.
