# AgroGestor

Base del sistema AgroGestor: frontend React + TypeScript, aplicación de escritorio Tauri, API HTTP local con Axum, PostgreSQL y simulador IoT.

## Desarrollo

1. Copia las variables de `src-tauri/.env.example` a `src-tauri/.env` y configura `DATABASE_URL`.
2. Inicia PostgreSQL y crea la base de datos `agrogestor`.
3. Ejecuta `npm install`.
4. Ejecuta `npm run tauri dev` para abrir la aplicación.

El frontend consume la API en `http://127.0.0.1:8787` (configurable con `VITE_API_BASE_URL`; si cambias el puerto de API, configura también esta variable para el build). Al arrancar, el backend aplica las migraciones pendientes y carga las zonas, las 25 camas, las posiciones iniciales, los umbrales y el lote `RSC-2026-014`. `/health` comprueba la conexión con PostgreSQL.

La Fase 1 expone `GET /api/produccion/camas`, `GET /api/diseno/zonas` y `PATCH` para camas y zonas. El plano visual carga `GET /api/diseno/plano/` y guarda la posición de las camas con `PATCH /api/diseno/plano/camas/{codigo}`; el backend impide mover una cama fuera de su zona. Las escrituras requieren `X-Gestor` (`proyecto`, `comercial`, `calidad` o `diseno`) para registrar el área responsable del cambio; no hay selector de gestor en la interfaz. Por ejemplo:

El plano incluye una ilustración de referencia que también se ve sin conexión. Las camas están modeladas como rectángulos de 25 × 10 m (250 m² cada una), dentro de tres invernaderos con camas visibles al entrar; usa la rueda del ratón para acercar o alejar alrededor del cursor. El relieve, la infraestructura y los cauces son esquemáticos, no un levantamiento topográfico. Para sincronizar la geometría y los cambios, configura `DATABASE_URL` en `src-tauri/.env` e inicia PostgreSQL antes de abrir la aplicación.

La API de escritorio reintenta el arranque con espera gradual si PostgreSQL aún no está listo; el indicador superior se actualiza periódicamente. Si usas `npm run tauri dev`, reinicia Tauri después de agregar o cambiar `src-tauri/.env`.

```powershell
curl.exe http://127.0.0.1:8787/api/produccion/camas
curl.exe "http://127.0.0.1:8787/api/produccion/camas?zona=C"
curl.exe http://127.0.0.1:8787/api/diseno/zonas
curl.exe -X PATCH http://127.0.0.1:8787/api/produccion/camas/c-05 `
  -H "Content-Type: application/json" -H "X-Gestor: proyecto" `
  -d '{"estado":"sembrada"}'
```

El simulador se instala con `npm install` dentro de `tools/simulador-iot` y se inicia con `npm start` desde esa carpeta. Las demás áreas de negocio siguen como estructura pendiente.

`src-tauri/icons/icon.ico` es un ícono temporal mínimo requerido por la compilación de Tauri en Windows; los íconos del starter fueron eliminados.
