import { useEffect, useMemo, useState } from "react";
import type { TonoBadge } from "../../../shared/ui/Badge";
import { Badge } from "../../../shared/ui/Badge";
import { EstadoCarga } from "./EstadoCarga";
import { obtenerCadena } from "../services/trazabilidad.service";
import type { CadenaLote, DestinoOrden, OrigenCama } from "../types";
import { calcularPorcentaje, formatearFecha, formatearNumero } from "../utils/formato";
import { mensajeErrorTrazabilidad } from "../utils/errores";

interface CadenaCamaClienteProps {
  codigo: string;
}

export function CadenaCamaCliente({ codigo }: CadenaCamaClienteProps) {
  const [datos, setDatos] = useState<CadenaLote | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setCargando(true);
    setError(null);
    setDatos(null);

    obtenerCadena(codigo, controller.signal)
      .then(setDatos)
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          mensajeErrorTrazabilidad(cause, "No se pudo cargar la cadena del lote."),
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargando(false);
      });

    return () => controller.abort();
  }, [codigo, intento]);

  const vacio = !!datos && datos.origen.length === 0 && datos.destinos.length === 0;

  return (
    <div className="traz-contenido" aria-label={`Cadena del lote ${codigo}`}>
      <EstadoCarga
        cargando={cargando}
        error={error}
        vacio={vacio}
        mensajeVacio="Este lote todavía no tiene cosechas ni ventas registradas."
        onReintentar={() => setIntento((actual) => actual + 1)}
      >
        {datos && <Cadena cadena={datos} />}
      </EstadoCarga>
    </div>
  );
}

function Cadena({ cadena }: { cadena: CadenaLote }) {
  const clientes = useMemo(() => agruparPorCliente(cadena.destinos), [cadena.destinos]);

  return (
    <>
      <div className="traz-cadena">
        <div className="traz-columna">
          <h3 className="traz-columna-titulo">Camas de origen</h3>
          {cadena.origen.length === 0 ? (
            <p className="traz-nota">Sin cosechas asociadas.</p>
          ) : (
            cadena.origen.map((origen) => (
              <TarjetaCama
                key={`${origen.cama_id}-${origen.siembra_id}`}
                origen={origen}
              />
            ))
          )}
        </div>

        <span className="traz-flecha" aria-hidden="true">→</span>

        <div className="traz-columna">
          <h3 className="traz-columna-titulo">Lote</h3>
          <article className="traz-tarjeta traz-tarjeta-lote">
            <header className="traz-tarjeta-cabecera">
              <strong className="traz-codigo">{cadena.lote.codigo}</strong>
              <Badge tono={tonoEstado(cadena.lote.estado)}>
                {cadena.lote.estado}
              </Badge>
            </header>
            <dl className="traz-metricas">
              <div><dt>Tallos</dt><dd>{formatearNumero(cadena.lote.total_tallos)}</dd></div>
              <div><dt>Cosechas</dt><dd>{formatearNumero(cadena.lote.cosechas)}</dd></div>
              <div><dt>Camas</dt><dd>{formatearNumero(cadena.lote.camas)}</dd></div>
              <div><dt>Clientes</dt><dd>{formatearNumero(cadena.lote.clientes)}</dd></div>
            </dl>
            {cadena.lote.observaciones && (
              <p className="traz-nota">{cadena.lote.observaciones}</p>
            )}
          </article>
        </div>

        <span className="traz-flecha" aria-hidden="true">→</span>

        <div className="traz-columna">
          <h3 className="traz-columna-titulo">Clientes</h3>
          {clientes.length === 0 ? (
            <p className="traz-nota">Aún no se ha vendido este lote.</p>
          ) : (
            clientes.map((cliente) => (
              <TarjetaCliente key={cliente.cliente_id} cliente={cliente} />
            ))
          )}
        </div>
      </div>

      {cadena.despachos.length > 0 && (
        <section className="traz-despachos">
          <h3 className="traz-columna-titulo">Despachos</h3>
          <div className="traz-tabla-wrap">
            <table className="traz-tabla traz-tabla-despachos">
              <thead>
                <tr>
                  <th scope="col">Despacho</th>
                  <th scope="col">Orden</th>
                  <th scope="col">Fecha</th>
                  <th scope="col">Estado</th>
                  <th scope="col">Transportador</th>
                  <th scope="col">Guía</th>
                  <th scope="col" className="traz-num">Tallos</th>
                </tr>
              </thead>
              <tbody>
                {cadena.despachos.map((despacho) => (
                  <tr key={despacho.despacho_id}>
                    <td>#{despacho.despacho_id}</td>
                    <td>#{despacho.orden_id}</td>
                    <td>{formatearFecha(despacho.fecha)}</td>
                    <td><Badge tono={tonoEstado(despacho.estado)}>{despacho.estado}</Badge></td>
                    <td>{despacho.transportador ?? "—"}</td>
                    <td>{despacho.guia ?? "—"}</td>
                    <td className="traz-num">{formatearNumero(despacho.tallos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}

function TarjetaCama({ origen }: { origen: OrigenCama }) {
  return (
    <article className="traz-tarjeta">
      <header className="traz-tarjeta-cabecera">
        <strong>Cama {origen.cama_codigo}</strong>
        <span className="traz-nota">{origen.zona}</span>
      </header>
      <p className="traz-nota">
        Siembra #{origen.siembra_id} · {formatearFecha(origen.fecha_siembra)} ·{" "}
        {formatearNumero(origen.plantas_sembradas)} plantas ·{" "}
        <Badge tono={tonoEstado(origen.estado_siembra)}>{origen.estado_siembra}</Badge>
      </p>
      <p className="traz-total">
        {formatearNumero(origen.tallos)}{" "}
        <small>tallos en {formatearNumero(origen.cosechas)} cosechas</small>
      </p>
      <BarraCalidad
        primera={origen.tallos_primera}
        segunda={origen.tallos_segunda}
        descarte={origen.tallos_descarte}
      />
      <p className="traz-nota">
        Cosechada del {formatearFecha(origen.primera_cosecha)} al{" "}
        {formatearFecha(origen.ultima_cosecha)}
      </p>
    </article>
  );
}

function BarraCalidad({
  primera,
  segunda,
  descarte,
}: {
  primera: number;
  segunda: number;
  descarte: number;
}) {
  const total = primera + segunda + descarte;
  const partes = [
    { clave: "primera", etiqueta: "Primera", valor: primera },
    { clave: "segunda", etiqueta: "Segunda", valor: segunda },
    { clave: "descarte", etiqueta: "Descarte", valor: descarte },
  ];

  return (
    <div className="traz-calidad">
      <div
        className="traz-calidad-barra"
        role="img"
        aria-label={partes
          .map((parte) => `${parte.etiqueta}: ${formatearNumero(parte.valor)}`)
          .join(", ")}
      >
        {partes.map((parte) => (
          parte.valor > 0 && (
            <span
              key={parte.clave}
              className="traz-calidad-tramo"
              data-calidad={parte.clave}
              style={{ width: `${calcularPorcentaje(parte.valor, total)}%` }}
            />
          )
        ))}
      </div>
      <ul className="traz-calidad-leyenda">
        {partes.map((parte) => (
          <li key={parte.clave} data-calidad={parte.clave}>
            {parte.etiqueta} <strong>{formatearNumero(parte.valor)}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface ClienteAgrupado {
  cliente_id: number;
  cliente: string;
  ciudad: string | null;
  ordenes: DestinoOrden[];
  pedido: number;
  despachado: number;
}

function agruparPorCliente(destinos: DestinoOrden[]): ClienteAgrupado[] {
  const grupos = new Map<number, ClienteAgrupado>();
  for (const destino of destinos) {
    let grupo = grupos.get(destino.cliente_id);
    if (!grupo) {
      grupo = {
        cliente_id: destino.cliente_id,
        cliente: destino.cliente,
        ciudad: destino.ciudad,
        ordenes: [],
        pedido: 0,
        despachado: 0,
      };
      grupos.set(destino.cliente_id, grupo);
    }

    grupo.ordenes.push(destino);
    if (destino.estado_orden !== "cancelada") {
      grupo.pedido += destino.tallos_orden;
      grupo.despachado += destino.tallos_despachados;
    }
  }
  return [...grupos.values()];
}

function TarjetaCliente({ cliente }: { cliente: ClienteAgrupado }) {
  return (
    <article className="traz-tarjeta">
      <header className="traz-tarjeta-cabecera">
        <strong>{cliente.cliente}</strong>
        {cliente.ciudad && <span className="traz-nota">{cliente.ciudad}</span>}
      </header>
      <Progreso pedido={cliente.pedido} despachado={cliente.despachado} />
      <ul className="traz-ordenes">
        {cliente.ordenes.map((orden) => {
          const cancelada = orden.estado_orden === "cancelada";
          return (
            <li
              key={orden.orden_item_id}
              className={cancelada ? "traz-orden traz-orden-cancelada" : "traz-orden"}
            >
              <span>Orden #{orden.orden_id} · {formatearFecha(orden.fecha_orden)}</span>
              <Badge tono={tonoEstado(orden.estado_orden)}>{orden.estado_orden}</Badge>
              <span className="traz-num">
                {formatearNumero(orden.tallos_despachados)} /{" "}
                {formatearNumero(orden.tallos_orden)}
              </span>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

function Progreso({ pedido, despachado }: { pedido: number; despachado: number }) {
  const porcentaje = calcularPorcentaje(despachado, pedido);
  const excede = despachado > pedido;
  const completo = pedido > 0 && despachado >= pedido;

  return (
    <div className="traz-progreso">
      <div
        className="traz-progreso-pista"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={pedido || 1}
        aria-valuenow={pedido ? Math.min(despachado, pedido) : 0}
        aria-label="Tallos despachados frente a lo pedido"
      >
        <span
          className="traz-progreso-relleno"
          data-completo={completo || undefined}
          style={{ width: `${porcentaje}%` }}
        />
      </div>
      <p className="traz-nota">
        <strong>{formatearNumero(despachado)}</strong> despachados de{" "}
        <strong>{formatearNumero(pedido)}</strong> pedidos ({Math.round(porcentaje)}%)
        {excede && " · despachado supera lo pedido"}
        {pedido === 0 && " · sin pedidos activos"}
      </p>
    </div>
  );
}

function tonoEstado(estado: string): TonoBadge {
  if (["abierto", "activa", "cosechada", "despachada", "entregado"].includes(estado)) {
    return "ok";
  }
  if (["cancelada", "cancelado", "rechazada"].includes(estado)) {
    return "critico";
  }
  if (["pendiente", "confirmada", "programado", "en_transito"].includes(estado)) {
    return "riesgo";
  }
  return "neutro";
}
