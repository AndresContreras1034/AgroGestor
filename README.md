# AgroGestor

Base del sistema AgroGestor: frontend React + TypeScript, aplicación de escritorio Tauri, API HTTP local con Axum, PostgreSQL y simulador IoT.

## Desarrollo

1. Copia las variables de `src-tauri/.env.example` a `src-tauri/.env` y configura `DATABASE_URL`.
2. Inicia PostgreSQL y prepara la base de datos.
3. Ejecuta `npm install`.
4. Ejecuta `npm run tauri dev` para abrir la aplicación.

El frontend consume la API en `http://127.0.0.1:3000` (configurable con `VITE_API_BASE_URL`; si cambias el puerto de API, configura también esta variable para el build). El endpoint `/health` verifica la conexión con PostgreSQL. La ingesta HTTP está declarada, pero devuelve `501 Not Implemented` hasta implementar la persistencia de lecturas.

El simulador se instala con `npm install` dentro de `tools/simulador-iot` y se inicia con `npm start` desde esa carpeta. Los módulos de negocio y las migraciones se dejan como estructura; aún no implementan funcionalidades.

`src-tauri/icons/icon.ico` es un ícono temporal mínimo requerido por la compilación de Tauri en Windows; los íconos del starter fueron eliminados.
