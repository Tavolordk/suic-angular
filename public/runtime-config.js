// Configuracion fallback para desarrollo local y ejecuciones fuera de Docker.
// Cuando Angular corre en :4202, el navegador usa el mismo origen y Angular
// reenvia las peticiones mediante src/proxy.conf.json. Esto permite que otras
// PCs de la misma red solo necesiten acceder a la maquina que ejecuta ng serve.
const isLanDevelopment =
  typeof globalThis.location !== 'undefined' && globalThis.location.port === '4202';

globalThis.__APP_CONFIG__ = Object.freeze({
  gatewayUrl: isLanDevelopment ? '/gateway' : 'http://10.237.3.42:8081',
  intelligenceApiUrl: isLanDevelopment ? '/intelligence' : 'http://127.0.0.1:8080'
});
