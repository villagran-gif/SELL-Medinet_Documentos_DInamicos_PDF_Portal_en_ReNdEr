# Hotfix Stage 1 — Preview + CTA contacto existente

Reemplaza estos 2 archivos en el repo:

- `public/deal_context_stage1.js`
- `public/deal_context_stage1.css`

Este hotfix corrige:

1. Si `Vista previa` queda sin tarjeta visible, reconstruye una vista previa humana desde los campos del formulario.
2. Si ya existe contacto y no existe deal, muestra el mismo botón verde `CREAR TRATO...`.
3. El botón guarda/sincroniza `window.__lastContactId`, muestra el header del deal y hace scroll/focus al bloque DEAL.
4. Mantiene la validación estricta de `Colaborador1`.

No toca BOX IA ni el payload sensible de `/api/create-deal`.
