import { useEffect,useState } from "react";
import { Spinner } from "../../shared/ui/Spinner";
import { obtenerProduccionAnalitica,obtenerResumenAnalitico,obtenerSemaforo } from "./services/analitica.service";
import type { ProduccionSerie,ResumenAnalitico,SemaforoItem } from "./types";
import { AsistenteIA } from "./components/AsistenteIA";
import "./analitica.css";

export function AnaliticaPage(){
 const[resumen,setResumen]=useState<ResumenAnalitico|null>(null);
 const[produccion,setProduccion]=useState<ProduccionSerie[]>([]);
 const[semaforo,setSemaforo]=useState<SemaforoItem[]>([]);
 const[loading,setLoading]=useState(true);const[error,setError]=useState<string|null>(null);
 useEffect(()=>{const c=new AbortController();Promise.all([obtenerResumenAnalitico(c.signal),obtenerProduccionAnalitica(c.signal),obtenerSemaforo(c.signal)])
 .then(([r,p,s])=>{setResumen(r);setProduccion(p);setSemaforo(s)})
 .catch(cause=>{if(!c.signal.aborted)setError(cause instanceof Error?cause.message:"No se pudo cargar la analítica.")})
 .finally(()=>{if(!c.signal.aborted)setLoading(false)});return()=>c.abort()},[]);
 if(loading)return<section className="analitica-state"><Spinner etiqueta="Calculando indicadores"/></section>;
 if(error)return<section className="analitica-state analitica-error"><p>{error}</p></section>;
 if(!resumen)return null;
 const max=Math.max(...produccion.map(p=>p.tallos),1);
 return<section className="analitica"><header className="analitica-header"><div><span>Indicadores operativos</span><h1>Analítica</h1><p>Resumen construido desde las operaciones registradas</p></div></header>
 <div className="analitica-kpis"><article><span>Camas</span><strong>{resumen.camas}</strong><small>{resumen.siembras_activas} siembras activas</small></article><article><span>Tallos cosechados</span><strong>{resumen.tallos_cosechados.toLocaleString("es-CO")}</strong><small>{resumen.lotes_abiertos} lotes abiertos</small></article><article><span>Lecturas 24 h</span><strong>{resumen.lecturas_24h}</strong><small>{resumen.alertas_iot} nodos en alerta</small></article><article><span>Incidencias abiertas</span><strong>{resumen.incidencias_abiertas}</strong><small>{resumen.clientes_activos} clientes activos</small></article></div>
 <div className="analitica-grid"><section className="analitica-panel"><div className="analitica-panel-header"><h2>Cosecha diaria</h2><p>Últimos 14 días</p></div><div className="analitica-bars" aria-label="Cosecha diaria">{produccion.map(p=><div className="analitica-bar" key={p.fecha}><strong>{p.tallos}</strong><div><span style={{height:`${Math.max(8,p.tallos/max*100)}%`}}/></div><small>{p.fecha.slice(5)}</small></div>)}{!produccion.length&&<p className="analitica-empty">Sin cosechas recientes.</p>}</div></section>
 <section className="analitica-panel"><div className="analitica-panel-header"><h2>Semáforo IoT por zona</h2><p>Lecturas de las últimas 24 horas</p></div><div className="semaforo-grid">{semaforo.map(s=><article key={s.zona}><span className={`semaforo semaforo-${s.estado}`} aria-label={s.estado}/><div><strong>Zona {s.zona}</strong><p>{s.lecturas} lecturas · {s.alertas} fuera de rango</p></div></article>)}</div></section></div>
 <AsistenteIA/></section>
}
