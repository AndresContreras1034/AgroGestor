# AgroGestor

Sistema de escritorio para administrar la producción, el monitoreo, la calidad, la trazabilidad y la operación comercial de una finca agrícola.

AgroGestor combina React y TypeScript con Tauri, Rust, Axum y PostgreSQL. Incluye un plano interactivo de camas, módulos operativos, ingesta de datos IoT y una arquitectura preparada para dividir responsabilidades por dominio.

## Estado del proyecto

Este repositorio es una aplicación modular en desarrollo. La base técnica está implementada y varias áreas tienen interfaces y endpoints funcionales; otras áreas siguen en construcción.

| Área | Estado visible en el repositorio |
|---|---|
| Plano de diseño | Implementado |
| Producción: camas | Implementado |
| Producción: siembras, lotes, labores y cosechas | Flujos estructurados y tablas/módulos implementados |
| Monitoreo e ingesta | Implementado con simulador HTTP y Azure IoT Hub |
| Calidad | Incidencias, inspecciones y tratamientos implementados |
| Comercial | Clientes, órdenes y despachos implementados |
| Trazabilidad | Buscador de lotes y vista de cadena implementados |
| Analítica | Módulo base, semáforo y predicción estructurados |
| Business intelligence | Vistas SQL y documentación base |
| Empaquetado y despliegue | Pendiente de automatización completa |

## Capturas

Agrega imágenes reales dentro de `docs/screenshots/` y enlázalas aquí cuando el flujo esté disponible en una demostración estable:

```text
docs/screenshots/dashboard.png
docs/screenshots/plano.png
docs/screenshots/trazabilidad.png
```

## Arquitectura

```mermaid
flowchart LR
    UI[React + TypeScript] --> ROUTER[React Router]
    ROUTER --> PAGES[Páginas por dominio]
    PAGES --> API_CLIENT[Cliente HTTP]
    API_CLIENT --> AXUM[API local Axum]

    AXUM --> HANDLER[Handlers]
    HANDLER --> SERVICE[Services]
    SERVICE --> REPO[Repositories]
    REPO --> SQLX[SQLx]
    SQLX --> PG[(PostgreSQL)]

    IOT[Simulador IoT] --> HTTP[Ingesta HTTP]
    IOT --> AZURE[Azure IoT Hub]
    HTTP --> AXUM
    AZURE --> AXUM

    AXUM --> MIGRATIONS[Migraciones SQL]
    MIGRATIONS --> PG
```

## Arquitectura del backend

El backend usa Tauri para la aplicación de escritorio y Axum para una API HTTP local en el puerto `8787`.

Los dominios están separados en módulos:

```text
src-tauri/src/modules/
  analitica/
  calidad/
  comercial/
  diseno/
  monitoreo/
  produccion/
  trazabilidad/
```

Dentro de los dominios relevantes se separan:

- DTO y modelos
- Handlers HTTP
- Reglas de servicio
- Consultas SQL
- Routers Axum

## Modelo de datos

El esquema PostgreSQL está organizado por migraciones versionadas:

- Esquemas y datos semilla
- Diseño y plano de camas
- Producción
- Monitoreo y umbrales
- Calidad
- Comercial
- Analítica y vistas BI
- Auditoría del plano
- Métricas y medidas

Las migraciones se ejecutan desde el arranque de la aplicación. El sistema crea zonas, camas, umbrales y datos iniciales necesarios para el entorno local.

## Frontend

La interfaz usa React, TypeScript y un diseño modular por áreas de negocio.

```text
src/
  app/
  modules/
    analitica/
    calidad/
    comercial/
    dashboard/
    monitoreo/
    plano/
    produccion/
    trazabilidad/
  shared/
  styles/
```

El plano permite visualizar tres zonas, acercar y desplazar el mapa y mover camas dentro de los límites configurados.

## API local

Al iniciar Tauri, la API escucha en `http://127.0.0.1:8787` de forma predeterminada.

| Ruta | Uso |
|---|---|
| `GET /health` | Verificar estado y conexión PostgreSQL |
| `GET /api/produccion/camas` | Consultar camas de producción |
| `PATCH /api/produccion/camas/{codigo}` | Modificar una cama |
| `GET /api/diseno/zonas` | Consultar zonas |
| `GET /api/diseno/plano/` | Consultar el plano |
| `PATCH /api/diseno/plano/camas/{codigo}` | Actualizar posición visual |

Las escrituras enviadas al backend pueden incluir `X-Gestor` con el área responsable:

- `proyecto`
- `comercial`
- `calidad`
- `diseno`

Ejemplo:

```powershell
curl.exe http://127.0.0.1:8787/health

curl.exe http://127.0.0.1:8787/api/produccion/camas

curl.exe -X PATCH "http://127.0.0.1:8787/api/produccion/camas/c-05" `
  -H "Content-Type: application/json" `
  -H "X-Gestor: proyecto" `
  -d '{"estado":"sembrada"}'
```

## Stack

| Capa | Tecnología |
|---|---|
| Escritorio | Tauri 2 |
| Backend | Rust 2024, Axum, Tokio |
| Persistencia | PostgreSQL, SQLx |
| Frontend | React 18, TypeScript, Vite |
| IoT | TypeScript, HTTP y Azure IoT Hub |
| Telemetría | Trazas con Tracing |
| Validación | Pruebas Rust unitarias e integración |

## Requisitos

- Windows 10 o Windows 11
- Node.js 20 o posterior
- npm
- Rust y Cargo
- PostgreSQL
- Microsoft C++ Build Tools para compilar Tauri
- Visual Studio Code, opcionalmente con `rust-analyzer`

## Instalación

### 1. Clonar

```powershell
git clone https://github.com/AndresContreras1034/AgroGestor.git
cd AgroGestor
```

### 2. Configurar PostgreSQL

Instala PostgreSQL y crea la base de datos:

```sql
CREATE DATABASE agrogestor;
```

### 3. Configurar entorno

Copia la configuración de ejemplo:

```powershell
Copy-Item src-tauri\.env.example src-tauri\.env
```

Edita `src-tauri/.env`:

```dotenv
DATABASE_URL=postgres://postgres:change_me@127.0.0.1:5432/agrogestor
AGRO_PORT=8787
AGRO_DB_MAX_CONEXIONES=5
RUST_LOG=info
```

No subas archivos `.env` ni credenciales reales.

### 4. Instalar dependencias

```powershell
npm install
```

### 5. Ejecutar

```powershell
npm run tauri dev
```

El backend aplica las migraciones al arrancar. Si PostgreSQL todavía no está disponible, el servicio reintenta el arranque con espera incremental.

## Simulador IoT

El proyecto incluye un simulador TypeScript para generar lecturas de humedad, temperatura, pH y conductividad.

```powershell
cd tools\simulador-iot
npm install
npm start
```

El publicador puede usar HTTP local o Azure IoT Hub según la configuración del simulador.

## Pruebas

Desde `src-tauri`:

```powershell
cargo test
cargo fmt --check
cargo check
```

Desde la raíz:

```powershell
npm run build
npm run tauri build
```

El repositorio incluye pruebas Rust para ingesta de lecturas y trazabilidad end-to-end.

## Automatización IoT

La ingesta admite:

- Publicador HTTP
- Adaptador Azure IoT Hub
- Nodos simulados
- Umbrales por variable
- Lecturas con timestamp
- Procesamiento y consulta histórica

## Seguridad

- Mantener `DATABASE_URL` fuera de Git
- Cambiar todas las contraseñas antes de desplegar
- Validar permisos de escritura en la API
- Revisar el encabezado `X-Gestor`
- No publicar datos reales de la finca
- Usar secretos administrados para Azure IoT Hub

## Limitaciones conocidas

- El plano usa una ilustración esquemática y no representa un levantamiento real.
- Algunas áreas siguen en fase de expansión.
- No existe una suite completa de CI en el repositorio.
- El empaquetado y firma para distribución aún no están automatizados.
- Las pruebas E2E dependen de PostgreSQL y configuración local.
- BI se encuentra en fase de estructura y diseño.

## Roadmap

- Completar los flujos de siembra, cosecha y labores
- Expandir dashboards y analítica
- Consolidar trazabilidad comercial
- Integrar más fuentes de monitoreo
- Añadir capturas y demostración estable
- Automatizar pruebas y CI
- Documentar el modelo entidad-relación
- Preparar empaquetado y despliegue
