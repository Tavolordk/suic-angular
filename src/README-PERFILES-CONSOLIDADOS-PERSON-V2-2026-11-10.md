# SPM-1.0 | Resultados Person v2 y perfiles consolidados

## Alcance

Implementación sobre el frontend recibido `src(20261110-175527).zip`.
No se modificaron archivos `.scss`, `.css`, `.svg`, iconos, imágenes ni recursos visuales. Se reutiliza la iconografía existente de Font Awesome y las clases originales.

- `kind === 'ConsolidatedProfile'` es la regla para mostrar la etiqueta **Consolidado** y bloquear edición y nuevas consolidaciones. Nunca se infiere a partir de `status`, nombre, ni `profileId`.
- Orden estable de consolidados al inicio de la **página actual**. Los consolidados comparten la paginación existente. El backend es responsable del orden **global** antes de paginar; el frontend no puede reordenar elementos que están en páginas todavía no descargadas.
- `consolidatedProfile` sólo se utiliza en las tarjetas cuyo `kind` es `ConsolidatedProfile`.
- El detalle de cada resultado usa `GET /api/search/{searchId}/results/{resultId}` y, para búsquedas guardadas, su equivalente de lectura histórica. Nunca se sustituye `resultId` por `profileId`.
- Para los resultados consolidados, una vez consultado el detalle, se recuperan los datos efectivamente persistidos desde `GET /api/consolidated-profiles/{profileId}`. Se reutiliza el servicio existente. Si ese GET falla, se mantiene el detalle y se avisa que sólo se están mostrando evidencias originales, sin presentarlas como guardadas.
- Las consultas llevan `Authorization: Bearer <accessToken>` de la sesión autenticada actual mediante el interceptor ya existente, sin fijar tokens ni cambiar el contrato de autenticación.
- `counts.consolidated` es opcional: si falta, el frontend lo interpreta como `0`.

## Tres tarjetas

1. **Fuentes detectadas:** se conserva la selección de fuente para navegar. En modo consolidado, la fuente se consulta pero no se modifica.
2. **Datos de la fuente:** muestra evidencias y campos del resultado en modo de solo lectura, diferenciando lo persistido y las evidencias originales.
3. **Perfil consolidado:** presenta datos reales persistidos, procedencia, fotos y vínculos si existen. No presenta acciones de agregar/quitar datos, crear perfil ni guardar nuevamente. Se conserva exportar PDF.

Los resultados ordinarios (`kind: 'Profile'`) mantienen sus controles originales.

## Validaciones

Se añadieron pruebas unitarias para el response Person v2 y la separación por `resultId`, el orden estable y el mapeo de datos persistidos sin selección artificial. Se validaron los helpers TypeScript de forma independiente. Este ZIP contiene únicamente `src`, tal como el recibido, por lo que no incluye `package.json` ni `node_modules`; la compilación integral con Angular CLI y la prueba contra los endpoints del ambiente de destino deben realizarse dentro del proyecto completo.
