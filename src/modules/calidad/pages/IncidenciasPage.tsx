import { useEffect, useState, type FormEvent } from "react";
import { listarCamas } from "../../produccion/services/camas.service";
import type { Cama } from "../../produccion/types";
import { Badge } from "../../../shared/ui/Badge";
import { Button } from "../../../shared/ui/Button";
import { Spinner } from "../../../shared/ui/Spinner";
import { ModuleSubnav } from "../../../shared/ui/ModuleSubnav";
import { cambiarIncidencia, crearIncidencia, listarIncidencias } from "../services/calidad.service";
import type { Incidencia } from "../types";
import "./calidad.css";

export function IncidenciasPage() {
  const [filas,setFilas]=useState<Incidencia[]>([]);
  const [camas,setCamas]=useState<Cama[]>([]);
  const [cargando,setCargando]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [cama,setCama]=useState("");
  const [nombre,setNombre]=useState("");
  const [tipo,setTipo]=useState("plaga");
  const [severidad,setSeveridad]=useState("media");
  const [descripcion,setDescripcion]=useState("");

  async function cargar(signal?:AbortSignal) {
    setCargando(true); setError(null);
    try {
      const [inc,camasData]=await Promise.all([listarIncidencias(signal),listarCamas(signal)]);
      setFilas(inc); setCamas(camasData);
      if (!cama && camasData[0]) setCama(camasData[0].codigo);
    } catch(cause) { if(!(cause instanceof DOMException&&cause.name==="AbortError")) setError(cause instanceof Error?cause.message:"No se pudieron cargar las incidencias."); }
    finally { if(!signal?.aborted)setCargando(false); }
  }
  useEffect(()=>{const c=new AbortController();void cargar(c.signal);return()=>c.abort();},[]);

  async function guardar(event:FormEvent) {
    event.preventDefault(); setError(null);
    try {
      await crearIncidencia({cama_codigo:cama,siembra_id:null,tipo,nombre,severidad,detectada_en:null,descripcion:descripcion||null});
      setNombre("");setDescripcion("");await cargar();
    }catch(cause){setError(cause instanceof Error?cause.message:"No se pudo registrar la incidencia.");}
  }
  async function resolver(item:Incidencia) {
    try{await cambiarIncidencia(item.id,"resuelta");await cargar();}catch(cause){setError(cause instanceof Error?cause.message:"No se pudo actualizar.");}
  }

  return <section className="calidad">
    <header className="calidad-header"><div><span>Manejo fitosanitario</span><h1>Incidencias</h1></div><Button onClick={()=>void cargar()} disabled={cargando}>Actualizar</Button></header>
    <ModuleSubnav label="Secciones de Calidad" items={[
      { to:"/calidad/incidencias",label:"Incidencias" },
      { to:"/calidad/tratamientos",label:"Tratamientos" },
      { to:"/calidad/inspecciones",label:"Inspecciones" },
    ]}/>
    {error&&<p className="calidad-error" role="alert">{error}</p>}
    <div className="calidad-layout">
      <section className="calidad-panel"><div className="calidad-panel-header"><h2>Registro fitosanitario</h2><p>{filas.length} incidencias</p></div>
        {cargando?<div className="calidad-state"><Spinner etiqueta="Cargando incidencias"/></div>:<div className="calidad-table-wrap"><table className="calidad-table"><thead><tr><th>Cama</th><th>Incidencia</th><th>Tipo</th><th>Severidad</th><th>Estado</th><th>Fecha</th><th></th></tr></thead><tbody>
          {filas.map(item=><tr key={item.id}><td><strong>{item.cama_codigo}</strong></td><td>{item.nombre}</td><td>{item.tipo}</td><td>{item.severidad}</td><td><Badge tono={item.estado==="resuelta"?"ok":item.severidad==="critica"?"critico":"riesgo"}>{item.estado}</Badge></td><td>{item.detectada_en}</td><td>{item.estado!=="resuelta"&&<Button onClick={()=>void resolver(item)}>Resolver</Button>}</td></tr>)}
          {!filas.length&&<tr><td colSpan={7} className="calidad-empty">No hay incidencias registradas.</td></tr>}
        </tbody></table></div>}
      </section>
      <aside className="calidad-panel"><div className="calidad-panel-header"><h2>Registrar incidencia</h2></div><form className="calidad-form" onSubmit={guardar}>
        <label>Cama<select value={cama} onChange={e=>setCama(e.target.value)} required><option value="">Seleccionar</option>{camas.map(c=><option key={c.id} value={c.codigo}>{c.codigo}</option>)}</select></label>
        <label>Nombre<input value={nombre} onChange={e=>setNombre(e.target.value)} required/></label>
        <label>Tipo<select value={tipo} onChange={e=>setTipo(e.target.value)}><option value="plaga">Plaga</option><option value="enfermedad">Enfermedad</option><option value="brote">Brote</option><option value="otro">Otro</option></select></label>
        <label>Severidad<select value={severidad} onChange={e=>setSeveridad(e.target.value)}><option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option><option value="critica">Crítica</option></select></label>
        <label>Descripción<textarea value={descripcion} onChange={e=>setDescripcion(e.target.value)} rows={3}/></label>
        <Button variante="primario" type="submit" disabled={!cama||!nombre.trim()}>Registrar</Button>
      </form></aside>
    </div>
  </section>;
}
