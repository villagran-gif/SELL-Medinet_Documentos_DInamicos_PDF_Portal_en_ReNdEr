Cómo aplicar los cambios core (Portal repo)

Estos parches actualizan:
- public/index.html  (estatura en cm + botón Subir a Medinet)
- public/app.js      (estatura -> cm, botón Subir a Medinet + subida al backend)
- server.js          (IMC correcto usando estatura en cm, guarda estatura en Sell como cm)
- server.js          (proxy seguro a sell-medinet-backend: POST /api/medinet/import)

En tu repo:

1) Copia la carpeta patches/ a la raíz del repo (o deja los .patch en cualquier lado).

2) Aplica en este orden (recomendado):

   git apply patches/portal_core_changes.patch
   git apply patches/portal_app_changes.patch
   git apply patches/portal_app_medinet_button.patch
   git apply patches/portal_server_changes.patch
   git apply patches/portal_server_medinet_proxy.patch

3) Variables de entorno en Render (Portal):

   MEDINET_BACKEND_BASE_URL=https://sell-medinet-backend.onrender.com
   MEDINET_BACKEND_API_KEY=<la misma API_KEY del backend sell-medinet-backend>

Si algún patch falla por contexto, abre el archivo y aplica manualmente:
- index.html: cambia label de Estatura a "cm" y agrega el botón btnDealToMedinet
- app.js: usa MEDINET_IMPORT_ENDPOINT='/api/medinet/import' y envía estatura en cm
- server.js: convierte estaturaRaw a cm/m y usa estaturaM para IMC, estaturaCm para custom_field
- server.js: agrega rutas /api/medinet/import y /api/medinet/search que proxyan con header X-API-Key
