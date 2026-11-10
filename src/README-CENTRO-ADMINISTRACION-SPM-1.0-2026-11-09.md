# SPM-1.0 — Centro de Administración (propuesta visual)

## Incluido

- Nueva ruta Angular protegida `/administracion` mediante `authGuard`.
- Enlaces al centro de administración desde el menú del usuario (visible también en móvil) y las barras laterales de búsqueda, consolidación, investigaciones y líneas.
- Prototipo HTML original incorporado en `src/assets/administracion/spm-centro-administracion.html`, adaptado únicamente al modo incrustado (`?embedded=1`), sin duplicar el encabezado ni la barra principal de SPM.
- Se preserva la interactividad **simulada** del HTML: panel general, usuarios, roles y permisos, acceso a módulos, investigaciones, sesiones, solicitudes, auditoría, configuración, filtros, modales, exportación de muestras y términos de uso.
- La maqueta corre en un `iframe sandbox` aislado **sin** `allow-same-origin` y sin comunicación con el token, usuario ni APIs del frontend.
- Se conserva intacta la integración previa de los endpoints de búsquedas guardadas.

## Alcance y seguridad

**Es un prototipo visual.** Los usuarios, sesiones, métricas, roles, solicitudes y operaciones son datos simulados del archivo original. La maqueta no llama a AuthCentral ni a endpoints de administración, ni modifica permisos o identidades reales.

**El `authGuard` solo protege la ruta**, no constituye autorización administrativa. Antes de habilitar operaciones reales debe definirse en backend una política de roles/permisos por operación/recurso y validarse también en frontend la visibilidad de la sección. No añadir APIs no contratadas.

El panel se sirve como recurso estático del frontend. El servidor/Angular debe publicar `src/assets/administracion/` dentro de su ruta de assets.

## Prueba manual

1. Iniciar sesión en SPM y abrir **Centro de administración (propuesta)** en el menú de perfil o el escudo de la barra lateral.
2. Confirmar URL `/administracion` y encabezado de sesión SPM sin duplicados.
3. Navegar todas las secciones internas del prototipo (las acciones deben indicar que son simuladas).
4. En vista móvil, desplegar el menú de la maqueta con el botón superior izquierdo.
5. Volver a Búsqueda y comprobar que los flujos de búsquedas guardadas siguen funcionando.

## Limitaciones de validación

La entrega original consiste en `src/`, sin `package.json`, `angular.json` ni `node_modules`; no es posible ejecutar `ng build` ni el conjunto completo de pruebas Angular exclusivamente con este archivo.
