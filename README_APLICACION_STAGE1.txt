ZIP ETAPA 1 - PATCH SEGURO Y REVERSIBLE
======================================

Objetivo
--------
Aplicar solo la Etapa 1 acordada, sin tocar:
- parseo BOX IA
- validacion actual de estatura en centimetros
- payload actual de /api/create-deal

Que hace este patch
-------------------
1) Agrega CTA post-contacto:
   "CREAR TRATO para CONTACTO ... · CONTACT_ID ..."

2) Al presionar ese CTA:
   - baja al bloque Crear DEAL / TRATO
   - muestra encabezado:
     "🪛 Creando DEAL/TRATO de NOMBRE · RUT · CONTACT_ID 🔧"

3) Convierte Colaborador1 en lista estricta y obligatoria con estas opciones:
   - Carolin
   - Camila
   - Gabriela
   - Allison
   - MariaPaz
   - Danitza
   - Giselle

Archivos incluidos
------------------
/public/deal_context_stage1.js
/public/deal_context_stage1.css

Aplicacion minima en public/index.html
--------------------------------------
1. En <head>, agregar esta linea despues de los otros CSS del portal:

   <link rel="stylesheet" href="/deal_context_stage1.css" />

2. Antes de </body>, agregar esta linea DESPUES de app.js y DESPUES de portal_nav_actions.js:

   <script src="/deal_context_stage1.js"></script>

Notas importantes
-----------------
- Este patch NO cambia app.js.
- Este patch NO cambia server.js.
- Este patch NO cambia BOX IA.
- Este patch NO toca validacion ni payload del PR sensible.
- Es facil de revertir: borrar los 2 includes y eliminar los 2 archivos.
