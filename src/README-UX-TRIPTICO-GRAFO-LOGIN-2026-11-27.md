# Actualización UX: tríptico, grafo y login — 27/11/2026

## Tríptico
- Sección Imágenes permanente en Resumen: sin evidencias muestra un icono SVG local; una imagen se muestra sin controles innecesarios; varias se recorren una a una por flechas o indicadores. Clic abre la vista ampliada. Una imagen que falla al cargar se retira del carrusel.
- Se utilizan imágenes de las evidencias del detalle (formatos data URI PNG/JPEG/WebP/GIF, rutas y URL con extensión de imagen). No se inventan datos ni endpoints.
- Archivos relacionados agrupa los archivos y los anteriores Objetos adicionales, conservando los campos y fuentes de los grupos de tipo `other`. Los vínculos Persona/Vehículo/Arma siguen independientes.
- La barra inferior conserva el mecanismo existente de ventanas minimizadas; ahora anima la salida, aumenta el icono al enfocarlo o pasar el cursor, hace un salto al restaurar y anima el panel de entrada. Respeta `prefers-reduced-motion`.

## Grafo
- La señal `pivotLoading()` existente controla un modal centrado de búsqueda, con animación indeterminada y nombre del nodo. Bloquea las interacciones mientras la petición está pendiente; se retira al completar, fallar o cancelar el flujo. Se conserva el aviso de sin resultados y la navegación a búsqueda cuando hay coincidencias.

## Login
- Telegram (habilitado) y SMS (deshabilitado) comparten Usuario + Número de celular. Correo habilita Usuario + Correo electrónico. Se elimina visualmente el campo no utilizado y se limpia/deshabilita su control; CAPTCHA y términos se conservan.
- `smsEnabled = false` deja SMS bloqueado en la interfaz y en el controlador. El contrato MFA actual selecciona el contacto por `medioContacto`; no tiene un parámetro explícito para diferenciar SMS de Telegram. No activar SMS hasta que el backend soporte su envío por ese canal y se valide el contrato.

## Validación recomendada en el proyecto completo
1. Ejecutar `ng build` y los tests del proyecto con las dependencias originales.
2. Abrir trípticos de persona, vehículo y arma con cero, una y varias imágenes; comprobar ampliación, navegación, imágenes rotas y fuentes. Verificar que los expedientes y otros objetos aparezcan en Archivos relacionados y no en un apartado separado.
3. Minimizar y restaurar las tres ventanas, también en pantalla pequeña y con movimiento reducido. Comprobar foco y que clics repetidos no dupliquen transiciones.
4. Doble clic en un nodo válido con respuesta lenta, éxito, cero resultados y error. Revisar que el modal se cierre en cada desenlace y no haya búsquedas duplicadas.
5. Alternar Telegram y Correo; revisar validación del contacto activo, CAPTCHA, términos y que SMS permanezca deshabilitado.

Se verificó sintaxis de TypeScript modificado y se ejecutaron casos del mapper de imágenes en Node. Se añadieron pruebas de regresión para el mapper y el estado de búsqueda del grafo. El ZIP recibido solo contiene `src/`; no incluye configuración Angular, package.json ni dependencias, por lo que no se pudo ejecutar una compilación Angular integral, Vitest ni pruebas visuales en navegador.
