// ── SERVICE WORKER DO BOLEIROS ──────────────────────────────────────
// Estratégia: Network-First com fallback de cache + auto-update
//
// • Pra HTML (navegação): sempre tenta rede primeiro → atualizações chegam rápido
// • Pra outros recursos: serve do cache, atualiza em background
// • Funciona offline usando o último cache válido
//
// IMPORTANTE: cada vez que esse arquivo for editado, o navegador vai detectar
// a mudança (byte-a-byte diff) e instalar a nova versão automaticamente.

const CACHE_VERSION = "boleiros-v1.1";
const RUNTIME_CACHE = "boleiros-runtime";

// INSTALL — toma controle imediatamente
self.addEventListener("install", function(e){
  self.skipWaiting();
});

// ACTIVATE — limpa caches antigos e assume controle de todas as abas
self.addEventListener("activate", function(e){
  e.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(
        names.filter(function(n){ return n !== CACHE_VERSION && n !== RUNTIME_CACHE; })
             .map(function(n){ return caches.delete(n); })
      );
    }).then(function(){ return self.clients.claim(); })
  );
});

// FETCH — network-first pra HTML, cache-first pra outros recursos
self.addEventListener("fetch", function(e){
  if(e.request.method !== "GET") return;
  
  // Pra navegação (HTML): sempre tenta rede primeiro
  if(e.request.mode === "navigate" || e.request.destination === "document"){
    e.respondWith(
      fetch(e.request).then(function(resp){
        // Salvou versão nova no cache
        var clone = resp.clone();
        caches.open(RUNTIME_CACHE).then(function(c){ 
          c.put(e.request, clone); 
        });
        return resp;
      }).catch(function(){
        // Sem rede → usa cache
        return caches.match(e.request);
      })
    );
    return;
  }
  
  // Pra outros recursos (imagens, scripts externos): cache-first com revalidação
  e.respondWith(
    caches.match(e.request).then(function(cached){
      var fetchPromise = fetch(e.request).then(function(resp){
        if(resp && resp.ok){
          var clone = resp.clone();
          caches.open(RUNTIME_CACHE).then(function(c){ 
            c.put(e.request, clone); 
          });
        }
        return resp;
      }).catch(function(){ return cached; });
      return cached || fetchPromise;
    })
  );
});
