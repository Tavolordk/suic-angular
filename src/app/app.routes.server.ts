import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * La autenticación de SUIC depende de localStorage (access/refresh token, sesión
 * y control de pestaña activa). El servidor no puede leer ese estado del navegador.
 *
 * Si una ruta protegida se renderiza con RenderMode.Server, durante un hard refresh
 * el authGuard ve una sesión vacía y redirige temporalmente a /login. Además, una
 * página SSR puede intentar consumir APIs protegidas sin Authorization antes de que
 * el navegador hidrate la aplicación. Al hidratar, AuthStorage sí recupera la sesión
 * y publicGuard termina enviando al usuario a /busqueda, perdiendo la URL original.
 *
 * Estas rutas deben resolverse en el navegador para que el primer guard y el primer
 * request protegido ya tengan disponible la misma sesión persistida en localStorage.
 * Esto también conserva la ruta actual al recargar (/grafo, /lineas-investigacion,
 * /perfil-consolidado, etc.) y elimina el flash del login.
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Client
  }
];
