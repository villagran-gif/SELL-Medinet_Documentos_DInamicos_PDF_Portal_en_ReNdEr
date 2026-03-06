Portal patch v4 (Acciones rápidas + Exportar a Medinet + Subir a Medinet)

1) Copia estos archivos al folder public/ del portal:
   - public/portal_nav_actions.js
   - public/portal_nav_actions.css

2) En tu public/index.html agrega (si no están) estas 2 líneas dentro de <head>:

   <link rel="stylesheet" href="/portal_nav_actions.css" />
   <script src="/portal_nav_actions.js"></script>

   (Puedes dejarlas después de style.css / tom-select.)

3) Para que la exportación funcione, el portal debe tener el endpoint:
   GET /api/deal-context?deal_id=<ID>

4) Subir a Medinet (modo seguro):
   - El JS llama a: POST /api/medinet/import
   - El Portal (server.js) debe proxyar hacia sell-medinet-backend:
       POST https://sell-medinet-backend.onrender.com/medinet/import
     agregando header X-API-Key.

   Variables de entorno en Render (Portal):
     MEDINET_BACKEND_BASE_URL=https://sell-medinet-backend.onrender.com
     MEDINET_BACKEND_API_KEY=<API_KEY del backend>

5) UX: puedes hacer click en cualquier link de trato (/sales/deals/<id>) dentro del portal
   y automáticamente se carga ese deal_id en esta sección.
