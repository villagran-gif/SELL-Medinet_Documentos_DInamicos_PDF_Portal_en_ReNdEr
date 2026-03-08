PATCH SEGURO Y REVERSIBLE — CTA POST DEAL -> CREAR DOCUMENTOS
===========================================================

Objetivo
--------
Agregar un CTA verde debajo de “Deal creado: ... Mobile” y por sobre “Ver detalle técnico (JSON)”.

Texto del CTA
-------------
👇🖨️ CREAR DOCUMENTOS para DEAL_NAME + RUT + DEAL_ID 📑👇

Qué hace
--------
1) Detecta cuando d_summary muestra “Deal creado: ...”.
2) Inserta un botón verde debajo del resumen del deal.
3) Al hacer click:
   - hace scroll al bloque de búsqueda por RUT
   - rellena el input #rut con el RUT del contacto/deal
   - dispara el submit del formulario (Buscar)
   - pinta #btnCreateDocs de verde
   - enfoca Agente si falta seleccionarlo

Archivos incluidos
------------------
/public/deal_docs_cta_stage1.css
/public/deal_docs_cta_stage1.js
/index_html_minimo.diff

Aplicación mínima en public/index.html
--------------------------------------
1. En <head>, agregar:
   <link rel="stylesheet" href="/deal_docs_cta_stage1.css" />

2. Antes de </body>, agregar DESPUES de app.js, links_patch.js, portal_nav_actions.js y deal_context_stage1.js:
   <script src="/deal_docs_cta_stage1.js"></script>

Notas
-----
- No reemplaza el CTA post-contacto existente.
- No toca app.js.
- No toca server.js.
- No toca BOX IA.
- Es fácil de revertir: quitar includes y borrar estos 2 archivos.
