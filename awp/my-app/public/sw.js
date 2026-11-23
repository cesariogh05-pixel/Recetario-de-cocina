
const CACHE_NAME = 'recetas-app-v1';        
const IMAGE_CACHE_NAME = 'recetas-imagenes-v1'; 
const DATA_CACHE_NAME = 'recetas-datos-v1';     

// Páginas que se guardan al instalar
const STATIC_ASSETS = [
  '/',
  '/explorar',
  '/recetas',
  '/favoritos',
  '/perfil',
  '/receta',
  '/logonuevo.png',
  '/fondonuevo.jpg',
];

//guarda las páginas principales
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cacheando recursos estáticos');
      // si una ruta falla, las demás se guardan igual
      return Promise.allSettled(STATIC_ASSETS.map((ruta) => cache.add(ruta)));
    })
  );
  self.skipWaiting();
});

// borra cachés viejas
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker...');
  event.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(
        nombres.map((nombre) => {
          if (nombre !== CACHE_NAME && nombre !== IMAGE_CACHE_NAME && nombre !== DATA_CACHE_NAME) {
            console.log('[SW] Borrando caché antigua:', nombre);
            return caches.delete(nombre);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// manejo de peticiones
self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (!request.url.startsWith('http')) return;
  const url = new URL(request.url);

  //Datos de recetas: Server Actions de Next---
  if (request.method === 'POST' && request.headers.has('Next-Action')) {
    event.respondWith(manejarAccion(request));
    return;
  }

 
  if (request.method !== 'GET') return;

  // primero caché, si no está la busca en la red
  if (
    url.pathname.startsWith('/_next/image') ||
    url.pathname.startsWith('/storage/v1/')
  ) {
    event.respondWith(
      caches.match(request).then((guardada) => {
        if (guardada) {
          console.log('[SW] Imagen entregada desde caché:', request.url);
          return guardada;
        }
        return fetch(request).then((respuesta) => {
          if (respuesta && (respuesta.status === 200 || respuesta.type === 'opaque')) {
            const copia = respuesta.clone();
            caches.open(IMAGE_CACHE_NAME).then((cache) => cache.put(request, copia));
          }
          return respuesta;
        });
      })
    );
    return;
  }

  
  if (url.hostname.includes('supabase.co')) {
    if (!url.pathname.startsWith('/rest/v1/')) return;
    event.respondWith(redPrimero(request, DATA_CACHE_NAME));
    return;
  }

  
  event.respondWith(
    redPrimero(request, CACHE_NAME).catch(async () => {
      // Si la página nunca se visitó, mostramos la raíz 
      if (request.mode === 'navigate') {
        const pagina = await caches.match(url.pathname, { ignoreSearch: true });
        return pagina || caches.match('/');
      }
      return Response.error();
    })
  );
});

//intenta la red, guarda copia; si falla usa la caché
function redPrimero(request, nombreCache) {
  return fetch(request)
    .then((respuesta) => {
      if (respuesta && respuesta.status === 200) {
        const copia = respuesta.clone();
        caches.open(nombreCache).then((cache) => cache.put(request, copia));
      }
      return respuesta;
    })
    .catch(async () => {
      console.log('[SW] Sin red, entregando desde caché:', request.url);
      const guardada = await caches.match(request);
      if (guardada) return guardada;
      throw new Error('No hay copia guardada');
    });
}


async function manejarAccion(request) {
  const cuerpo = await request.clone().text();
  const llave = new Request(
    new URL(request.url).origin + '/accion/' + request.headers.get('Next-Action') + '/' + encodeURIComponent(cuerpo)
  );

  try {
    const respuesta = await fetch(request);
    if (respuesta.ok) {
      const copia = respuesta.clone();
      const texto = await copia.text();
      if (!/"(ok|success)"\s*:/.test(texto)) {
        const cache = await caches.open(DATA_CACHE_NAME);
        await cache.put(llave, new Response(texto, { headers: { 'Content-Type': 'text/x-component' } }));
      }
    }
    return respuesta;
  } catch {
    console.log('[SW] Sin red, datos entregados desde caché');
    return (await caches.match(llave)) || Response.error();
  }
}
