self.addEventListener("install", (e) => {
  console.log("Service Worker instalado");
});

self.addEventListener("fetch", (e) => {
  // Maneja peticiones de red si deseas soporte offline
});
