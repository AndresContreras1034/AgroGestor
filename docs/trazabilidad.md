# Trazabilidad

El módulo permite buscar lotes y consultar su recorrido desde la cama de origen hasta las órdenes y los despachos registrados.

## Uso

1. Busca por código de lote y selecciona **Ver**.
2. Revisa el resumen del lote y la cadena con camas de origen, calidad cosechada, clientes, órdenes y despachos.
3. Usa los filtros de la línea de tiempo para limitar los eventos por tipo.

La cadena agrupa las órdenes por cliente. Las órdenes canceladas se mantienen visibles como referencia, pero no se incluyen en el total de pedidos ni en el progreso de despacho. Los despachos cancelados no suman al total despachado.

## API

- `GET /api/trazabilidad/lotes?q={texto}`: busca hasta 50 lotes por código.
- `GET /api/trazabilidad/lotes/{codigo}/cadena`: devuelve resumen, camas/cosechas de origen, órdenes por línea de lote y despachos.
- `GET /api/trazabilidad/lotes/{codigo}/linea-tiempo`: devuelve los eventos cronológicos ligados al lote.

Los endpoints son de solo lectura y usan la conexión PostgreSQL configurada por la aplicación.

## Alcance actual

La vista comercial refleja únicamente órdenes, líneas de orden y despachos existentes en AgroGestor. No representa facturación ni pagos. La línea de tiempo enlaza labores, incidencias, tratamientos e inspecciones a las siembras y camas de las que se cosechó el lote.

## Datos de demostración

Los scripts siguientes son manuales y no se ejecutan durante el arranque de la aplicación:

- `tools/seed/trazabilidad_demo.sql`: crea el lote `RSC-2099-999`, clientes demo, una siembra/cosechas y órdenes con despachos. Se puede ejecutar más de una vez.
- `tools/seed/trazabilidad_demo_limpiar.sql`: elimina únicamente los códigos, guías, marcadores de observación y NIT exactos usados por el script demo.

Ambos scripts apuntan a la cama existente `A-09` y no cambian su estado ni su posición en el plano. Revisa el servidor y la base de datos seleccionados antes de ejecutarlos.
