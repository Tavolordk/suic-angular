# SPM-1.0 — Corrección de impresión de términos y condiciones (10 de noviembre de 2026)

## Problema identificado
En Google Chrome, la vista previa de **Imprimir / Guardar PDF** aparecía como una sola página en blanco. La versión anterior intentaba imprimir desde un iframe invisible de 1 × 1 píxeles.

## Solución aplicada
Se retiró por completo la impresión mediante iframe. Ahora el botón genera temporalmente en el DOM una copia del texto legal existente y aplica un estilo exclusivo para impresión (`@media print`): oculta la página y el modal, permite que el documento fluya entre páginas A4, elimina límites de altura y scroll e imprime los nueve apartados.

- No se modificó el contenido ni sus enlaces legales.
- El botón funciona desde el login y las vistas autenticadas, porque ambos reutilizan el componente `app-terms-dialog`.
- Después de imprimir o cerrar la vista previa, el DOM y los estilos de impresión temporales se eliminan.
- No se necesitan APIs, endpoints, dependencias adicionales ni un servidor PDF.

## Archivos modificados
- `app/shared/components/terms-dialog/terms-dialog.ts`: lógica de impresión.
- `app/shared/components/terms-dialog/terms-dialog.spec.ts`: prueba de la preparación y limpieza del DOM imprimible.

## Verificación
El formato de impresión se probó con Chromium generando un PDF A4 de **2 páginas**, comprobando que aparecen los apartados 1 a 9, sin la pantalla del login y sin contenido recortado. Se inspeccionaron las dos páginas renderizadas. No se ejecutó una compilación completa de Angular porque el ZIP proporcionado contiene `src`, pero no el `package.json` ni las dependencias.

## Uso
Abrir SPM-1.0 > Términos y condiciones > **Imprimir / Guardar PDF** > Destino: **Guardar como PDF**. Para evitar encabezados de Chrome que incluyan `localhost:4202/login`, desactivar **Encabezados y pies de página** en Más opciones.
