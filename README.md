# AgroGestor

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Frontend](https://img.shields.io/badge/Frontend-React%2018-61dafb)](package.json)
[![Desktop](https://img.shields.io/badge/Desktop-Tauri%202-24c8db)](src-tauri/tauri.conf.json)

<p align="center">
  <img src="public/agrogestor-logo.svg" alt="Logotipo AgroGestor" width="128">
</p>

Sistema de escritorio para administrar la producción, el monitoreo, la calidad, la trazabilidad y la operación comercial de una finca agrícola.

AgroGestor combina React y TypeScript con Tauri, Rust, Axum y PostgreSQL. Incluye un plano interactivo de camas, módulos operativos, ingesta de datos IoT y una arquitectura preparada para dividir responsabilidades por dominio.

## Estado del proyecto

Este repositorio es una aplicación modular en desarrollo. La base técnica está implementada y varias áreas tienen interfaces y endpoints funcionales; otras áreas siguen en construcción.

### Ciclo de la cama

`disponible → (siembra) sembrada → (cosecha final) cosechada → en_descanso → disponible`

Cancelar una siembra activa devuelve la cama a disponible. `sembrada` solo cambia por siembras y cosechas; el `PATCH` manual rechaza esas transiciones.

### Cosechas parciales

Una siembra admite varios cortes. `POST /api/produccion/cosechas` recibe `cerrar_siembra` (por defecto `true`). Con `false`, la siembra sigue activa. Al cerrar, siembra y cama pasan a `cosechada` en la misma transacción.

La cama se deriva de la siembra en el servidor. Solo se puede cosechar en lotes abiertos.

| Área | Estado visible en el repositorio |
|---|---|
| Plano de diseño | Implementado |
| Producción: camas | Implementado |
| Producción: siembras, lotes, labores y cosechas | Flujos estructurados y tablas/módulos implementados |
| Monitoreo e ingesta | Implementado con simulador HTTP y Azure IoT Hub |
| Calidad | Incidencias, inspecciones y tratamientos implementados |
| Comercial | Clientes, órdenes y despachos implementados |
| Trazabilidad | Búsqueda, cadena de producción/venta y línea de tiempo implementadas |
| Analítica | Módulo base, semáforo y predicción estructurados |
| Business intelligence | Vistas SQL y documentación base |
| Empaquetado y despliegue | Pendiente de automatización completa |

## Flujo de producción

Una cama recorre un ciclo operativo completo. El flujo principal es:

```mermaid
flowchart LR
    A[Preparar cama] --> B[Registrar siembra]
    B --> C[Riegos y labores]
    C --> D{¿Cosecha lista?}
    D -->|No| C
    D -->|Sí| E[Cosechar tallos]
    E --> F[Clasificar calidad]
    F --> G[Crear o asignar lote]
    G --> H[Poscosecha y despacho]
    H --> I[Descanso]
    I --> A

    E --> J[Cosecha parcial]
    J --> C
```

Una siembra puede tener varias cosechas parciales. Solo la cosecha que se marca como final cambia la siembra y la cama al estado `cosechada`. El lote permanece abierto hasta que el proceso comercial lo cierre.

El backend realiza cada transición en una transacción para mantener consistentes cama y siembra.

```mermaid
stateDiagram-v2
    [*] --> disponible
    disponible --> sembrada: sembrar
    en_descanso --> sembrada: sembrar
    sembrada --> cosechada: cosechar
    sembrada --> disponible: cancelar siembra
    cosechada --> en_descanso: PATCH cama
    en_descanso --> disponible: PATCH cama
```

| Entidad | Estados | Reglas |
|---|---|---|
| Cama | `disponible`, `sembrada`, `cosechada`, `en_descanso` | Solo se siembra si está disponible o en descanso. |
| Siembra | `activa`, `cosechada`, `cancelada` | Máximo una activa por cama. Una cosecha puede cerrar la siembra o ser parcial. |
| Lote | `abierto`, `cerrado` | Código `RSC-AAAA-NNN` generado por el servidor. Un lote cerrado no admite cosechas. |
| Labor | riego, fertilización, poda, deshierbe, fumigación, otra | Se registra por cama o por siembra activa; la fecha no puede ser futura. |

Los `POST` y `PATCH` requieren `X-Gestor: proyecto`, `comercial`, `calidad` o `diseno`. Los errores usan `{ "error": { "codigo": "...", "mensaje": "..." } }`.

## Capturas

Capturas de la aplicación ejecutándose con datos de demostración:

| Inicio | Plano de camas |
|---|---|
| ![Panel de inicio de AgroGestor](docs/dashboard.png) | ![Plano de camas de la finca](docs/plano.png) |

### Trazabilidad de lotes

![Búsqueda y listado de lotes con su estado y totales](docs/trazabilidad.png)

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
| `GET /api/diseno/plano` | Consultar el plano |
| `PATCH /api/diseno/plano/camas/{codigo}` | Actualizar posición visual |
| `GET /api/trazabilidad/lotes?q={texto}` | Buscar lotes por código |
| `GET /api/trazabilidad/lotes/{codigo}/cadena` | Consultar origen, cosechas, destinos y despachos |
| `GET /api/trazabilidad/lotes/{codigo}/linea-tiempo` | Consultar eventos cronológicos del lote |

La vista y su alcance se describen en [docs/trazabilidad.md](docs/trazabilidad.md). La migración `0124_historial_trazabilidad.sql` carga ciclos históricos sintéticos de hasta cinco años para mostrar siembras, labores, cosechas, lotes, controles de calidad, ventas, despachos y lecturas IoT. Los scripts de `tools/seed/` siguen siendo opcionales y se ejecutan manualmente.

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

La migración `0124_historial_trazabilidad.sql` carga datos demostrativos de hasta cinco años: ciclos de cultivo, cosechas, labores, calidad, ventas, despachos y lecturas semanales de sensores. Las fechas se generan tomando como referencia el día en que se aplica la migración.

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
- Ampliar capturas y documentación de la demostración
- Automatizar pruebas y CI
- Documentar el modelo entidad-relación
- Preparar empaquetado y despliegue

## Licencia

AgroGestor se distribuye bajo la licencia **MIT**. Consulta el archivo [LICENSE](LICENSE) para conocer los términos completos.
