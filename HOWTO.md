# Cómo aplicar estos ZIPs (sin errores)

Estos ZIPs contienen **parches** (`.patch`) para aplicar con Git de forma segura.

## Backend / Portal (Repo B)
1) Descomprime `backend_header_patch.zip` en tu PC.
2) En tu repo local del backend:
   ```bash
   git checkout -b feat/header-docs
   git apply backend_drive_docs_header.patch
   git apply backend_server_header_call.patch
   git status
   git commit -am "Add automatic header DEAL.<id> agent@email (Docs API)"
   git push -u origin feat/header-docs
   ```
3) Abre PR en GitHub.

## Widget (Repo A)
1) Descomprime `widget_actor_patch.zip`.
2) En tu repo local del widget:
   ```bash
   git checkout -b feat/actor-to-backend
   git apply widget_send_actor.patch
   git status
   git commit -am "Send actor (users/self) to backend /v1 endpoints"
   git push -u origin feat/actor-to-backend
   ```
3) Abre PR en GitHub.

## Importante
- Confirmaste: **/v1/render** es el canon. Este update hace que el widget envíe `actor`, para que el backend pueda insertar el header.
- El backend inserta el header justo después de reemplazar placeholders y antes de exportar PDF.
