"""Genera tools/seed/historial_realista.sql para AgroGestor Ruscus.

Historial coherente 2022-01 -> hoy para 25 camas de Ruscus hypophyllum en
Santandersito (Cundinamarca): ciclos productivos, cosechas quincenales por cama,
lotes semanales (RSC-<anio ISO>-<semana ISO>), labores, MIPE, inspecciones,
ventas con despacho y lecturas IoT horarias.  Reproducible (semilla fija).
"""
import datetime as dt
import random
import sys
from collections import defaultdict

HOY = dt.date(2026, 11, 27)
INICIO = dt.date(2022, 1, 1)
LOTE_REF = (2026, 14)          # RSC-2026-014, lote de referencia
LOTE_REF_ID = 1                # se conserva el id original
R = random.Random(20260414)

D = dt.timedelta


def q(v):
    if v is None:
        return "NULL"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int, float)):
        return str(v)
    if isinstance(v, dt.datetime):
        return "'" + v.strftime("%Y-%m-%d %H:%M:%S") + "-05'"
    if isinstance(v, dt.date):
        return "'" + v.isoformat() + "'"
    return "'" + str(v).replace("'", "''") + "'"


def ts(d, h, m=0):
    return dt.datetime(d.year, d.month, d.day, h, m)


# ---------------------------------------------------------------- clima
def lluvia(d):
    """0..1 intensidad de temporada de lluvias (bimodal andino) + ENSO."""
    import math
    doy = d.timetuple().tm_yday
    base = 0.5 + 0.5 * math.cos(2 * math.pi * (doy - 118) / 182.6)
    return max(0.0, min(1.0, base + enso_lluvia(d)))


def enso_lluvia(d):
    if dt.date(2021, 10, 1) <= d <= dt.date(2023, 2, 28):
        return 0.22      # La Niña
    if dt.date(2023, 6, 1) <= d <= dt.date(2024, 4, 30):
        return -0.30     # El Niño
    return 0.0


def factor_crecimiento(d):
    # el rebrote responde ~5 semanas despues de la lluvia
    f = 0.82 + 0.30 * lluvia(d - D(35))
    if dt.date(2023, 8, 1) <= d <= dt.date(2024, 5, 31):
        f *= 0.86      # estrés hídrico El Niño
    return f


# ---------------------------------------------------------------- camas
CAMAS = []
cid = 1
for zona, n in (("A", 9), ("B", 8), ("C", 8)):
    for num in range(1, n + 1):
        CAMAS.append({"id": cid, "codigo": f"{zona}-{num:02d}", "zona": zona, "numero": num})
        cid += 1
CAMA = {c["codigo"]: c for c in CAMAS}

PERSONAL = {
    "jefe": "Edilberto Moreno (jefe de cultivo)",
    "riego": "Jhon Fredy Castro",
    "op1": "Nelson Ramírez",
    "op2": "Yeimy Carolina Pardo",
    "op3": "Wilson Alfonso Cruz",
    "mipe": "Luz Marina Rojas (monitora MIPE)",
    "cal1": "Ing. Paola Andrea Gómez",
    "cal2": "Ing. Camilo Rodríguez",
}
OPERARIOS = [PERSONAL["op1"], PERSONAL["op2"], PERSONAL["op3"]]

# eventos forzados
CANCELACIONES = {  # cama -> fecha de cancelacion del ciclo
    "B-05": dt.date(2022, 5, 12),
    "C-07": dt.date(2024, 3, 6),
}

# ---------------------------------------------------------------- simulacion de ciclos
siembras, cosechas_ev = [], []
estado_cama = {}
sid = 1
for c in CAMAS:
    dia_corte = c["numero"] % 4            # lunes..jueves
    fase = (c["id"] * 7) % 14              # alterna semanas de corte
    s = dt.date(2021, 11, 1) + D(R.randint(0, 70))
    ciclo_n = 0
    ultimo_fin = None
    while s <= HOY:
        ciclo_n += 1
        largo = R.randint(26, 34) * 7
        plantas = {"A": 440, "B": 410, "C": 380}[c["zona"]] + R.randint(-25, 35)
        primera = s + D(63)
        # primer dia de corte alineado al dia de semana/fase de la cama
        d0 = primera + D((dia_corte - primera.weekday()) % 7)
        if ((d0 - dt.date(2021, 1, 4)).days // 7) % 2 != (fase // 7):
            d0 += D(7)
        fin_plan = s + D(largo)
        cancel = CANCELACIONES.get(c["codigo"])
        cancelada = cancel is not None and s <= cancel <= fin_plan
        cortes = []
        d = d0
        while d <= fin_plan and d <= HOY:
            if cancelada and d >= cancel:
                break
            cortes.append(d)
            d += D(14)
        if cancelada:
            estado = "cancelada"
        elif fin_plan >= HOY:
            estado = "activa"
        else:
            estado = "cosechada"
        anio = s.year
        sem = "I" if s.month <= 6 else "II"
        obs = (f"Ciclo productivo {anio}-{sem} · Ruscus hypophyllum · {plantas} plantas en cama "
               f"de 30 m² bajo polisombra 70 %. Rebrote tras poda de renovación; primer corte estimado a 9 semanas.")
        if cancelada:
            obs += (" Ciclo cancelado por pudrición radicular (Phytophthora) en temporada de lluvias; "
                    "se retiró material afectado y se desinfectó la cama.")
        sb = {"id": sid, "cama": c, "fecha": s, "estimada": s + D(63), "plantas": plantas,
              "estado": estado, "obs": obs, "fin": (cancel if cancelada else (cortes[-1] if cortes else s)),
              "cortes": cortes, "n": ciclo_n}
        siembras.append(sb)
        for i, dc in enumerate(cortes):
            cosechas_ev.append({"cama": c, "siembra": sb, "fecha": dc, "idx": i,
                                "ultimo": (i == len(cortes) - 1 and estado == "cosechada")})
        sid += 1
        if estado == "activa":
            estado_cama[c["codigo"]] = "sembrada"
            break
        fin = sb["fin"]
        descanso = R.randint(40, 55) if cancelada else R.randint(14, 32)
        nxt = fin + D(descanso)
        if nxt > HOY:
            dias = (HOY - fin).days
            estado_cama[c["codigo"]] = "cosechada" if dias <= 3 and not cancelada else (
                "disponible" if cancelada else "en_descanso")
            break
        s = nxt
    else:
        pass

# Fuerza A-09 a 'disponible' si esta en descanso (cama nivelada lista para nuevo ciclo)
if estado_cama.get("A-09") == "en_descanso":
    estado_cama["A-09"] = "disponible"

# ---------------------------------------------------------------- incidencias (MIPE)
PLAGAS_SECAS = [
    ("plaga", "Ácaro rojo (Tetranychus urticae)", ["Abamectina 1.8 % EC|0.5 ml/L", "Aceite agrícola parafínico|5 ml/L", "Azadiractina (neem)|3 ml/L"]),
    ("plaga", "Trips (Frankliniella occidentalis)", ["Spinosad|0.5 ml/L", "Beauveria bassiana|2 g/L", "Azadiractina (neem)|3 ml/L"]),
    ("plaga", "Cochinilla harinosa (Pseudococcus sp.)", ["Jabón potásico|5 ml/L", "Aceite agrícola parafínico|5 ml/L"]),
]
ENF_LLUVIA = [
    ("enfermedad", "Antracnosis (Colletotrichum gloeosporioides)", ["Azoxistrobina|0.5 ml/L", "Mancozeb 80 % WP|2.5 g/L", "Bacillus subtilis|3 ml/L"]),
    ("enfermedad", "Moho gris (Botrytis cinerea)", ["Iprodiona|1.5 ml/L", "Clorotalonil|2 ml/L", "Bacillus subtilis|3 ml/L"]),
    ("enfermedad", "Mancha foliar (Cercospora sp.)", ["Mancozeb 80 % WP|2.5 g/L", "Clorotalonil|2 ml/L"]),
    ("enfermedad", "Pudrición radicular (Phytophthora sp.)", ["Fosetil-Al|2.5 g/L", "Propamocarb|2 ml/L", "Trichoderma harzianum|2 g/L"]),
    ("plaga", "Babosas y caracoles (Deroceras sp.)", ["Metaldehído cebo 5 %|5 g/m²", "Fosfato férrico cebo|5 g/m²"]),
]


def siembra_en(c, d):
    for sb in siembras:
        if sb["cama"] is c and sb["fecha"] <= d <= (sb["fin"] if sb["estado"] != "activa" else HOY):
            return sb
    return None


incidencias = []
iid = 1


def nueva_incidencia(c, d, tipo, nombre, sev, productos, desc, forzar_resuelta_en=None, aplicaciones=None):
    global iid
    edad = (HOY - d).days
    sb = siembra_en(c, d)
    dur = {"baja": 10, "media": 16, "alta": 24, "critica": 32}[sev] + R.randint(-3, 6)
    if aplicaciones is None:
        n_ap = {"baja": 1, "media": 2, "alta": 3, "critica": 3}[sev]
        aplicaciones = [d + D(1 + 7 * k) for k in range(n_ap)]
    aplicaciones = [a for a in aplicaciones if a <= HOY]
    if forzar_resuelta_en:
        dur = (forzar_resuelta_en - d).days
    if edad <= 2:
        estado, aplicaciones = "abierta", []
    elif edad < dur:
        estado = "en_tratamiento"
    else:
        estado = "resuelta"
    trat = []
    for k, a in enumerate(aplicaciones):
        prod, dosis = productos[k % len(productos)].split("|")
        trat.append({"producto": prod, "dosis": dosis, "fecha": a,
                     "resp": PERSONAL["mipe"] if k % 2 == 0 else PERSONAL["jefe"],
                     "obs": (f"Aplicación {k + 1} de {len(aplicaciones)} en {c['codigo']}; "
                             f"volumen 1.2 L/m², periodo de reingreso 12 h.")})
    inc = {"id": iid, "cama": c, "siembra": sb, "tipo": tipo, "nombre": nombre, "sev": sev,
           "estado": estado, "fecha": d, "desc": desc, "trat": trat,
           "resuelta_en": d + D(dur) if estado == "resuelta" else None}
    iid += 1
    incidencias.append(inc)
    return inc


# brotes forzados
for cod in ("B-02", "B-03", "B-04", "B-06"):
    nueva_incidencia(CAMA[cod], dt.date(2022, 4, 19) + D(R.randint(0, 6)), "brote" if cod == "B-03" else "enfermedad",
                     "Brote de moho gris (Botrytis cinerea)" if cod == "B-03" else "Moho gris (Botrytis cinerea)", "alta",
                     ENF_LLUVIA[1][2], "Lluvias continuas de La Niña, HR > 92 % por 6 noches seguidas. Lesiones en 15–20 % "
                     "de los filocladios; se reforzó la ventilación y se retiró el material afectado.")
nueva_incidencia(CAMA["B-05"], dt.date(2022, 5, 3), "enfermedad", "Pudrición radicular (Phytophthora sp.)", "critica",
                 ENF_LLUVIA[3][2], "Encharcamiento por lluvias extremas; marchitez en 40 % de la cama. "
                 "Se decide cancelar el ciclo el 12 de mayo.")
for cod in ("A-01", "A-02", "A-04", "A-05", "A-07"):
    nueva_incidencia(CAMA[cod], dt.date(2024, 2, 8) + D(R.randint(0, 9)), "brote" if cod == "A-04" else "plaga",
                     "Brote de ácaro rojo (Tetranychus urticae)" if cod == "A-04" else "Ácaro rojo (Tetranychus urticae)",
                     "alta" if cod in ("A-04", "A-05") else "media", PLAGAS_SECAS[0][2],
                     "Temporada seca de El Niño (máximas de 29 °C, HR < 55 % al mediodía). Bronceado en filocladios "
                     "y telarañas en el envés; umbral de acción superado (> 5 ácaros/hoja).")
nueva_incidencia(CAMA["C-07"], dt.date(2024, 2, 26), "enfermedad", "Pudrición radicular (Phytophthora sp.)", "critica",
                 ENF_LLUVIA[3][2], "Falla del drenaje de la cama tras riego excesivo durante la ola de calor; "
                 "se cancela el ciclo el 6 de marzo.")
for cod in ("C-02", "C-03", "C-05"):
    nueva_incidencia(CAMA[cod], dt.date(2025, 10, 14) + D(R.randint(0, 5)), "brote" if cod == "C-03" else "plaga",
                     "Brote de babosas y caracoles (Deroceras sp.)" if cod == "C-03" else "Babosas y caracoles (Deroceras sp.)",
                     "media", ENF_LLUVIA[4][2], "Temporada de lluvias de octubre; daño por raspado en tallos tiernos "
                     "del rebrote. Trampas de cerveza con 12–20 individuos por noche.")

# incidencias aleatorias
fechas_forzadas = {(i["cama"]["codigo"], i["fecha"]) for i in incidencias}
d = INICIO
while d <= HOY - D(1):
    ll = lluvia(d)
    for c in CAMAS:
        if R.random() < 0.0028 + 0.0045 * ll:
            t = R.choice(ENF_LLUVIA[:3] + ENF_LLUVIA[4:])
        elif R.random() < 0.0022 + 0.0045 * (1 - ll):
            t = R.choice(PLAGAS_SECAS)
        else:
            continue
        sev = R.choices(["baja", "media", "alta"], [60, 32, 8])[0]
        nueva_incidencia(c, d, t[0], t[1], sev, t[2],
                         R.choice(["Detectada en monitoreo semanal MIPE.",
                                   "Reportada por el operario durante el corte; confirmada por MIPE.",
                                   "Hallazgo en trampa/lupa durante inspección de rutina."]) +
                         f" Foco en {R.randint(2, 18)} % de la cama.")
    d += D(1)

# incidencias abiertas/en tratamiento recientes (estado actual realista)
nueva_incidencia(CAMA["B-07"], HOY - D(1), "plaga", "Trips (Frankliniella occidentalis)", "media", PLAGAS_SECAS[1][2],
                 "Detectados 8 trips por trampa azul en la última lectura; pendiente aplicación.")
nueva_incidencia(CAMA["C-06"], HOY - D(2), "enfermedad", "Mancha foliar (Cercospora sp.)", "baja", ENF_LLUVIA[2][2],
                 "Lesiones puntuales en filocladios basales; la cama además presenta humedad de suelo baja por "
                 "obstrucción de un microaspersor.")
nueva_incidencia(CAMA["A-03"], HOY - D(6), "enfermedad", "Antracnosis (Colletotrichum gloeosporioides)", "media",
                 ENF_LLUVIA[0][2], "Temporada de lluvias de noviembre; manchas necróticas en 6 % de los tallos.")
nueva_incidencia(CAMA["C-02"], HOY - D(9), "plaga", "Babosas y caracoles (Deroceras sp.)", "baja",
                 ENF_LLUVIA[4][2], "Daño leve en rebrotes; se instalaron trampas y cebo en el perímetro.")

# ---------------------------------------------------------------- cosechas y lotes
def iso(d):
    y, w, _ = d.isocalendar()
    return (y, w)


incid_por_cama = defaultdict(list)
for inc in incidencias:
    incid_por_cama[inc["cama"]["codigo"]].append(inc)


def afectacion(c, d):
    pen = 0.0
    for inc in incid_por_cama[c["codigo"]]:
        fin = inc["resuelta_en"] or HOY
        if inc["fecha"] - D(3) <= d <= fin + D(14):
            pen = max(pen, {"baja": 0.04, "media": 0.08, "alta": 0.16, "critica": 0.30}[inc["sev"]])
    return pen


# referencia: asegurar que la incidencia trazable RSC-2026-014 exista en una cama de zona B que corte esa semana
cortes_ref = [e for e in cosechas_ev if iso(e["fecha"]) == LOTE_REF]
zonas_ref = {e["cama"]["zona"] for e in cortes_ref}
if zonas_ref != {"A", "B", "C"}:
    sys.exit(f"La semana de referencia no cubre las 3 zonas: {sorted(zonas_ref)}")
cama_ref = sorted([e for e in cortes_ref if e["cama"]["zona"] == "B"], key=lambda e: e["cama"]["numero"])[0]
fecha_ref = cama_ref["fecha"]
inc_ref = nueva_incidencia(
    cama_ref["cama"], fecha_ref - D(15), "enfermedad", "Antracnosis (Colletotrichum gloeosporioides)", "media",
    ENF_LLUVIA[0][2],
    "Inicio de lluvias de marzo; manchas necróticas en 7 % de los filocladios. Se aisló la cama, se aplicó "
    "fungicida y se reforzó la limpieza. Liberada para corte tras inspección del 27-mar.",
    forzar_resuelta_en=fecha_ref - D(4), aplicaciones=[fecha_ref - D(14), fecha_ref - D(7)])
incid_por_cama[cama_ref["cama"]["codigo"]].append(inc_ref)

cosechas = []
lotes = {}
coid = 1
for e in sorted(cosechas_ev, key=lambda x: (x["fecha"], x["cama"]["id"])):
    c, sb, d = e["cama"], e["siembra"], e["fecha"]
    rampa = [0.55, 0.78, 0.92][e["idx"]] if e["idx"] < 3 else 1.0
    anios = (d - INICIO).days / 365.25
    base = sb["plantas"] * 0.62 * factor_crecimiento(d) * rampa * (1 + 0.035 * anios)
    tallos = int(base * R.uniform(0.88, 1.12))
    pen = afectacion(c, d)
    p_prim = R.uniform(0.72, 0.82) - pen
    p_desc = R.uniform(0.035, 0.07) + pen * 0.7
    p_seg = 1 - p_prim - p_desc
    key = iso(d)
    if key not in lotes:
        lotes[key] = {"anio": key[0], "sec": key[1], "fechas": []}
    lotes[key]["fechas"].append(d)
    for cal, p in (("primera", p_prim), ("segunda", p_seg), ("descarte", p_desc)):
        n = int(round(tallos * p))
        if n <= 0:
            continue
        hora = 6 + (c["numero"] % 3)
        cosechas.append({"id": coid, "cama": c, "siembra": sb, "lote_key": key, "fecha": d, "tallos": n,
                         "calidad": cal, "creado": ts(d, hora + 4, (c["id"] * 7) % 60)})
        coid += 1

# ids de lotes: referencia conserva id 1, resto cronologico desde 2
lote_id = 2
for key in sorted(lotes):
    L = lotes[key]
    L["id"] = LOTE_REF_ID if key == LOTE_REF else lote_id
    if key != LOTE_REF:
        lote_id += 1
    L["codigo"] = f"RSC-{key[0]}-{key[1]:03d}"
    lunes = dt.date.fromisocalendar(key[0], key[1], 1)
    L["lunes"] = lunes
    L["estado"] = "abierto" if key == iso(HOY) else "cerrado"
    L["creado"] = ts(min(L["fechas"]), 5, 40)
    L["cerrado"] = ts(lunes + D(5), 12, 0)
for co in cosechas:
    co["lote_id"] = lotes[co["lote_key"]]["id"]

stock = {}
for co in cosechas:
    if co["calidad"] == "descarte":
        continue
    stock.setdefault(co["lote_key"], {"primera": 0, "segunda": 0})
    stock[co["lote_key"]][co["calidad"]] += co["tallos"]

# ---------------------------------------------------------------- clientes
CLIENTES = [
    # nombre, nit, tipo, email, tel, ciudad, desde, hasta, peso, (min,max) tallos, destino
    ("Mercado Floral Central (Paloquemao)", "900.214.587-3", "mayorista", "compras@mercadofloralcentral.example", "6013425587", "Bogotá", "2022-01-01", None, 16, (350, 900), None),
    ("Flores de la Sabana S.A.S.", "901.087.332-1", "distribuidor_floral", "pedidos@floresdelasabana.example", "6018617420", "Chía", "2022-01-01", None, 12, (120, 380), None),
    ("Exportadora Flor Andina S.A.S.", "900.556.019-8", "exportador", "operaciones@florandina.example", "6014239100", "Bogotá", "2022-01-01", None, 10, (600, 1400), "Miami (EE. UU.)"),
    ("Comercializadora Verde Follaje Ltda.", "800.193.477-5", "mayorista", "compras@verdefollaje.example", "6044481920", "Medellín", "2022-01-01", None, 9, (300, 750), None),
    ("Central Mayorista del Valle", "805.032.661-2", "mayorista", "flores@centralvalle.example", "6026604512", "Cali", "2022-01-01", None, 7, (250, 650), None),
    ("Floristería El Jardín de Chapinero", "1.019.087.554-6", "distribuidor_floral", "eljardinchapinero@correo.example", "3104452871", "Bogotá", "2022-01-01", None, 8, (60, 180), None),
    ("Flores y Detalles del Eje", "816.004.218-9", "distribuidor_floral", "pedidos@floresdeleje.example", "6063358842", "Pereira", "2022-01-01", None, 5, (90, 260), None),
    ("Abastecimiento Floral Santander", "804.017.552-4", "mayorista", "compras@floralsantander.example", "6076432290", "Bucaramanga", "2022-03-01", None, 5, (220, 560), None),
    ("Andean Greens Export S.A.S.", "901.334.208-7", "exportador", "logistics@andeangreens.example", "6045369920", "Rionegro", "2022-09-01", None, 7, (700, 1600), "Ámsterdam (Países Bajos)"),
    ("Floristerías Unidas de Colombia", "900.778.120-0", "distribuidor_floral", "compras@floristeriasunidas.example", "6017443600", "Bogotá", "2022-01-01", None, 6, (100, 320), None),
    ("Decoraciones y Eventos Caribe S.A.S.", "901.256.774-3", "otro", "eventos@decocaribe.example", "6053851144", "Barranquilla", "2022-06-01", None, 3, (150, 450), None),
    ("Follajes del Café Export S.A.S.", "901.402.815-2", "exportador", "export@follajescafe.example", "6068874301", "Manizales", "2023-04-01", None, 5, (500, 1200), "Toronto (Canadá)"),
    ("Mercaflor Soacha", "900.932.106-1", "mayorista", "mercaflorsoacha@correo.example", "3203317745", "Soacha", "2022-01-01", None, 4, (180, 480), None),
    ("Hotel y Centro de Eventos La Sabana", "860.512.339-8", "otro", "compras@hotellasabana.example", "6018623300", "Chía", "2022-01-01", "2024-06-30", 3, (80, 220), None),
    ("Flor Express Medellín", "901.115.648-0", "distribuidor_floral", "flor.express@correo.example", "3006129984", "Medellín", "2022-01-01", "2023-08-31", 3, (70, 240), None),
    ("Bouquet Studio S.A.S.", "901.701.256-5", "distribuidor_floral", "hola@bouquetstudio.example", "3115578210", "Bogotá", "2025-02-01", None, 5, (90, 280), None),
]
clientes = []
for i, c in enumerate(CLIENTES, start=1):
    clientes.append({"id": i, "nombre": c[0], "nit": c[1], "tipo": c[2], "email": c[3], "tel": c[4],
                     "ciudad": c[5], "desde": dt.date.fromisoformat(c[6]),
                     "hasta": dt.date.fromisoformat(c[7]) if c[7] else None, "peso": c[8], "rango": c[9],
                     "destino": c[10]})
CLI = {c["nombre"]: c for c in clientes}

TRANSPORTE = {
    "Bogotá": "TransFrío Andino S.A.S.", "Chía": "TransFrío Andino S.A.S.", "Soacha": "TransFrío Andino S.A.S.",
    "Medellín": "Carga Floral Express", "Rionegro": "Carga Floral Express", "Pereira": "Carga Floral Express",
    "Manizales": "Carga Floral Express", "Cali": "Logística Refrigerada del Valle",
    "Bucaramanga": "Rutas del Norte Cargo", "Barranquilla": "Rutas del Norte Cargo",
}
PREFIJO_GUIA = {"TransFrío Andino S.A.S.": "TFA", "Carga Floral Express": "CFE",
                "Logística Refrigerada del Valle": "LRV", "Rutas del Norte Cargo": "RNC"}

PRECIO_BASE = {2021: 340, 2022: 360, 2023: 400, 2024: 430, 2025: 455, 2026: 480}
FACTOR_TIPO = {"exportador": 1.32, "mayorista": 0.90, "distribuidor_floral": 1.06, "otro": 1.12}


def temporada(d):
    m, dd = d.month, d.day
    if (m == 1 and dd >= 20) or (m == 2 and dd <= 12):
        return 1.18, "Temporada San Valentín"
    if (m == 4 and dd >= 15) or (m == 5 and dd <= 8):
        return 1.15, "Temporada Día de la Madre"
    if m == 9 and dd <= 18:
        return 1.08, "Temporada Amor y Amistad"
    if m == 12 and dd <= 20:
        return 1.10, "Temporada navideña"
    return 1.0, None


def demanda(d):
    f, _ = temporada(d)
    return min(0.98, 0.84 + (f - 1) * 0.8)


ordenes, items, despachos, ditems = [], [], [], []
oid = iid_item = did = diid = 1
guia_n = defaultdict(int)
semanas = sorted(stock)


def clientes_activos(d):
    return [c for c in clientes if c["desde"] <= d and (c["hasta"] is None or d <= c["hasta"])]


def crear_orden(cli, fecha, piezas, nota, forzar_estado=None):
    """piezas: list of (lote_key, tallos_primera, tallos_segunda)"""
    global oid, iid_item, did, diid
    f, temp = temporada(fecha)
    edad = (HOY - fecha).days
    cancel = forzar_estado is None and R.random() < 0.022 and edad > 7
    if forzar_estado:
        estado = forzar_estado
    elif cancel:
        estado = "cancelada"
    elif edad <= 1:
        estado = R.choice(["pendiente", "confirmada"])
    elif edad <= 2:
        estado = "confirmada"
    else:
        estado = "despachada"
    obs = nota or (temp + (f" – destino {cli['destino']}" if cli["destino"] else "") if temp else
                   (f"Pedido semanal – destino final {cli['destino']}" if cli["destino"] else "Pedido semanal"))
    if cancel:
        obs += ". Cancelada por el cliente (reprogramó la compra)."
    o = {"id": oid, "cli": cli, "fecha": fecha, "estado": estado, "obs": obs,
         "creado": ts(fecha, R.randint(7, 16), R.randint(0, 59))}
    ordenes.append(o)
    oid += 1
    its = []
    for key, p1, p2 in piezas:
        n = p1 + p2
        if n <= 0:
            continue
        precio = PRECIO_BASE[key[0]] * FACTOR_TIPO[cli["tipo"]] * f
        precio *= (1 - 0.38 * (p2 / n))
        precio = int(round(precio * R.uniform(0.97, 1.03) / 10.0)) * 10
        it = {"id": iid_item, "orden": o, "lote_id": lotes[key]["id"], "tallos": n, "precio": precio}
        items.append(it)
        its.append(it)
        iid_item += 1
    if estado == "despachada":
        export = cli["tipo"] == "exportador"
        fd = fecha + D(2 if export else 1)
        if fd > HOY:
            est_d = "programado"
        elif fd >= HOY - D(1):
            est_d = "en_transito"
        else:
            est_d = "entregado"
        if export:
            transp = "Agencia de Carga Aérea El Dorado"
            guia_n["AWB"] += 1
            guia = f"AWB 729-{fd.year % 100:02d}{guia_n['AWB']:06d}"
            obs_d = (f"Embarque aéreo BOG → {cli['destino']}. Cadena de frío 2–4 °C. "
                     f"Certificado fitosanitario ICA CF-{fd.year}-{R.randint(10000, 99999)}.")
        else:
            transp = TRANSPORTE[cli["ciudad"]]
            pref = PREFIJO_GUIA[transp]
            guia_n[pref] += 1
            guia = f"{pref}-{fd.year}-{guia_n[pref]:05d}"
            obs_d = (f"Furgón refrigerado a {cli['ciudad']}. Entregado en cuarto frío del cliente."
                     if est_d == "entregado" else f"Furgón refrigerado a {cli['ciudad']}.")
        dsp = {"id": did, "orden": o, "fecha": fd, "estado": est_d, "transp": transp, "guia": guia,
               "obs": obs_d, "creado": ts(min(fd, HOY), 6, R.randint(0, 59))}
        despachos.append(dsp)
        did += 1
        for it in its:
            ditems.append({"id": diid, "desp": dsp, "item": it, "tallos": it["tallos"]})
            diid += 1
    return o


# Ventas: FIFO sobre lotes con vida en poscosecha <= 12 dias
for i, key in enumerate(semanas):
    lunes = lotes[key]["lunes"]
    if key == LOTE_REF:
        continue   # se arma a mano mas abajo
    disp = stock[key]
    objetivo = demanda(lunes + D(3)) * (disp["primera"] + disp["segunda"])
    vendido = 0
    act = clientes_activos(lunes)
    intentos = 0
    while vendido < objetivo and intentos < 80:
        intentos += 1
        cli = R.choices(act, [c["peso"] for c in act])[0]
        quiere = R.randint(*cli["rango"])
        quiere = min(quiere, int(objetivo - vendido) + 50)
        if quiere < 40:
            break
        fecha = max(lotes[key]["fechas"]) + D(R.randint(0, 3))
        if fecha > HOY:
            fecha = HOY
        piezas = []
        restante = quiere
        for k2 in [key]:
            s = stock[k2]
            if cli["tipo"] == "exportador":
                p1 = min(restante, s["primera"])
                p2 = 0
            else:
                p2 = min(int(restante * R.uniform(0.15, 0.35)), s["segunda"])
                p1 = min(restante - p2, s["primera"])
                if p1 + p2 < restante:
                    p2 = min(restante - p1, s["segunda"])
            if p1 + p2 > 0:
                piezas.append((k2, p1, p2))
                restante -= p1 + p2
        # completa con el lote anterior si queda stock (mezcla de 2 lotes, comun en poscosecha)
        if restante > 60 and i > 0 and semanas[i - 1] != LOTE_REF:
            k0 = semanas[i - 1]
            s0 = stock[k0]
            p1 = min(restante, s0["primera"])
            if p1 > 0:
                piezas.append((k0, p1, 0))
                restante -= p1
        total = sum(p[1] + p[2] for p in piezas)
        if total < 30:
            break
        o = crear_orden(cli, fecha, piezas, None)
        if o["estado"] != "cancelada":
            for k2, p1, p2 in piezas:
                stock[k2]["primera"] -= p1
                stock[k2]["segunda"] -= p2
            vendido += total

# Lote de referencia RSC-2026-014: cama -> cliente final, armado a mano
ref = stock[LOTE_REF]
p1t, p2t = ref["primera"], ref["segunda"]
fref = max(lotes[LOTE_REF]["fechas"])
reparto = [
    (CLI["Exportadora Flor Andina S.A.S."], fref + D(1), 0.46, 0.0,
     "Pre-temporada Día de la Madre EE. UU. – destino final Miami (EE. UU.), cliente final: cadena de "
     "supermercados Floral Bay. Pedido de referencia para auditoría de trazabilidad RSC-2026-014."),
    (CLI["Mercado Floral Central (Paloquemao)"], fref + D(2), 0.24, 0.70,
     "Pedido semanal plaza de Paloquemao, bodega 14 – reventa a floristerías de Bogotá."),
    (CLI["Comercializadora Verde Follaje Ltda."], fref + D(2), 0.18, 0.30,
     "Pedido semanal – reparto a floristerías del Valle de Aburrá."),
    (CLI["Floristería El Jardín de Chapinero"], fref + D(3), 0.06, 0.0,
     "Arreglos para eventos de abril – cliente final consumidor."),
]
for cli, fecha, f1, f2, nota in reparto:
    n1, n2 = int(p1t * f1), int(p2t * f2)
    crear_orden(cli, fecha, [(LOTE_REF, n1, n2)], nota, forzar_estado="despachada")
    stock[LOTE_REF]["primera"] -= n1
    stock[LOTE_REF]["segunda"] -= n2

# ---------------------------------------------------------------- labores
labores = []
lid = 1
for sb in siembras:
    c = sb["cama"]
    fin = HOY if sb["estado"] == "activa" else sb["fin"]
    d = sb["fecha"]
    labores.append((c, sb, "poda", d, "Poda de renovación: corte a ras de tallos viejos e inicio del ciclo de rebrote.", PERSONAL["jefe"]))
    labores.append((c, sb, "fertilizacion", d + D(2), "Fertilización de fondo: compost 2 kg/m² + cal dolomita 100 g/m².", R.choice(OPERARIOS)))
    k = 0
    d = sb["fecha"] + D(7)
    while d <= fin and d <= HOY:
        ll = lluvia(d)
        if R.random() < 0.95:
            mm = 6 if ll > 0.6 else (10 if ll > 0.3 else 14)
            labores.append((c, sb, "riego", d, f"Riego por microaspersión {mm * 2} min ({mm} mm); humedad de suelo previa "
                            f"{int(28 + 30 * ll + R.randint(-4, 4))} %.", PERSONAL["riego"]))
        if k % 2 == 1:
            labores.append((c, sb, "fertilizacion", d + D(1), R.choice([
                "Fertirriego 15-15-15 + elementos menores, 1.5 g/L.",
                "Fertirriego nitrato de calcio 1 g/L + sulfato de magnesio 0.5 g/L.",
                "Fertirriego 10-30-10 para estimular rebrote, 1.2 g/L."]), PERSONAL["riego"]))
        if k % 4 == 2:
            labores.append((c, sb, "deshierbe", d + D(2), "Deshierbe manual de cama y calles; retiro de arvenses.", R.choice(OPERARIOS)))
        if k % 4 == 0 and k > 0:
            labores.append((c, sb, "poda", d + D(3), "Limpieza: retiro de tallos amarillos, secos o con daño mecánico.", R.choice(OPERARIOS)))
        if k % 4 == 3 and ll > 0.55:
            labores.append((c, sb, "fumigacion", d + D(1), "Aplicación preventiva con Bacillus subtilis 3 ml/L (temporada de lluvias).", PERSONAL["mipe"]))
        k += 1
        d += D(7)
for inc in incidencias:
    for t in inc["trat"]:
        sb = siembra_en(inc["cama"], t["fecha"])
        labores.append((inc["cama"], sb, "fumigacion", t["fecha"],
                        f"Control de {inc['nombre'].split(' (')[0].lower()}: {t['producto']} {t['dosis']}.", t["resp"]))
labores = [l for l in labores if l[3] <= HOY]
labores.sort(key=lambda l: (l[3], l[0]["id"]))

# ---------------------------------------------------------------- inspecciones
inspecciones = []
for c in CAMAS:
    d = INICIO + D(c["id"] % 28)
    while d <= HOY:
        pen = afectacion(c, d)
        puntaje = int(min(99, max(52, R.gauss(91, 3.5) - pen * 120)))
        res = "aprobada" if puntaje >= 80 else ("observada" if puntaje >= 65 else "rechazada")
        obs = {"aprobada": R.choice(["Cama conforme: sanidad, altura y color de filocladios dentro de estándar.",
                                     "Sin hallazgos; tallos de 55–70 cm, coloración verde intensa.",
                                     "Conforme. Calles limpias y drenaje en buen estado."]),
               "observada": "Hallazgos menores de sanidad; se programa refuerzo MIPE y reinspección.",
               "rechazada": "Cama no apta para corte de exportación hasta controlar el foco fitosanitario."}[res]
        inspecciones.append((c, d, res, puntaje, obs, R.choice([PERSONAL["cal1"], PERSONAL["cal2"]])))
        d += D(28)
# inspecciones de liberacion del lote de referencia
inspecciones.append((cama_ref["cama"], fecha_ref - D(4), "aprobada", 86,
                     "Reinspección tras antracnosis: foco controlado, sin lesiones activas. Cama liberada para corte.",
                     PERSONAL["cal1"]))
for e in cortes_ref:
    inspecciones.append((e["cama"], e["fecha"], "aprobada", R.randint(88, 96),
                         f"Inspección de poscosecha lote RSC-2026-014: tallos ≥ 60 cm, sin plagas, "
                         f"hidratación 4 h en solución con hipoclorito 0.2 ml/L.", PERSONAL["cal2"]))
inspecciones.sort(key=lambda x: (x[1], x[0]["id"]))

# ---------------------------------------------------------------- SQL
out = []
w = out.append
w("-- AgroGestor Ruscus · historial realista 2022-01-01 → 2026-11-27")
w("-- Generado por tools/seed/generar_historial.py (semilla fija). Reemplaza los datos")
w("-- transaccionales (siembras, cosechas, lotes, labores, calidad, ventas, lecturas).")
w("-- Conserva zonas, camas, plano, nodos y umbrales. Lote de referencia: RSC-2026-014.")
w("SET client_encoding = 'UTF8';")
w("SET synchronous_commit = off;")
w("TRUNCATE ventas.despacho_item, ventas.despacho, ventas.orden_item, ventas.orden, ventas.cliente,")
w("         calidad.tratamiento, calidad.incidencia, calidad.inspeccion,")
w("         produccion.cosecha, produccion.labor, produccion.siembra, monitoreo.lectura RESTART IDENTITY;")
w(f"DELETE FROM produccion.lote WHERE id <> {LOTE_REF_ID};")
w("")


def bulk(tabla, cols, filas, override=True):
    for i in range(0, len(filas), 800):
        chunk = filas[i:i + 800]
        w(f"INSERT INTO {tabla} ({', '.join(cols)})" + (" OVERRIDING SYSTEM VALUE" if override else "") + " VALUES")
        w(",\n".join("(" + ", ".join(q(v) for v in f) + ")" for f in chunk) + ";")


# zonas y camas
w("UPDATE finca.zona SET nombre = v.nombre, descripcion = v.descr, hectareas = v.ha, actualizado_por = 'diseno' FROM (VALUES")
w("  ('A', 'Zona A · Ladera alta', 'Plantación 2019, 9 camas de 30 m² bajo polisombra 70 %. Suelo franco-arcilloso, buen drenaje.', 0.08),")
w("  ('B', 'Zona B · Terraza media', 'Plantación 2020, 8 camas; zona más húmeda, susceptible a hongos en temporada de lluvias.', 0.06),")
w("  ('C', 'Zona C · Ampliación baja', 'Ampliación 2021, 8 camas; mayor temperatura por menor altitud y exposición oeste.', 0.06)")
w(") AS v(codigo, nombre, descr, ha) WHERE zona.codigo = v.codigo;")
for c in CAMAS:
    est = estado_cama[c["codigo"]]
    obs = {"sembrada": "Ruscus hypophyllum en producción; corte quincenal.",
           "en_descanso": "En descanso tras cierre de ciclo: poda de renovación y abonado de fondo.",
           "cosechada": "Último corte del ciclo realizado; pendiente pasar a descanso.",
           "disponible": "Cama nivelada y abonada, lista para iniciar nuevo ciclo."}[est]
    w(f"UPDATE produccion.cama SET estado = {q(est)}, observaciones = {q(obs)}, actualizado_por = 'proyecto' "
      f"WHERE codigo = {q(c['codigo'])};")

bulk("produccion.siembra",
     ["id", "cama_id", "fecha_siembra", "fecha_estimada_cosecha", "plantas_sembradas", "estado", "observaciones",
      "registrado_por", "creado_en", "actualizado_en"],
     [(s["id"], s["cama"]["id"], s["fecha"], s["estimada"], s["plantas"], s["estado"], s["obs"], "proyecto",
       ts(s["fecha"], 7, 15), ts(min(s["fin"], HOY), 15, 30) if s["estado"] != "activa" else ts(s["fecha"], 7, 15))
      for s in siembras])

w(f"UPDATE produccion.lote SET observaciones = NULL WHERE id = {LOTE_REF_ID};")
lote_rows = []
for key in sorted(lotes):
    L = lotes[key]
    camas_l = sorted({co["cama"]["codigo"] for co in cosechas if co["lote_key"] == key})
    tot = sum(co["tallos"] for co in cosechas if co["lote_key"] == key)
    obs = (f"Semana ISO {key[1]} de {key[0]} ({L['lunes']:%d/%m} – {(L['lunes'] + D(6)):%d/%m}). "
           f"{len(camas_l)} camas, {tot} tallos. Poscosecha: hidratación 4 h y cuarto frío a 4 °C.")
    if key == LOTE_REF:
        obs = ("LOTE DE REFERENCIA – auditoría de trazabilidad de la cama al cliente final. " + obs +
               f" Cama {cama_ref['cama']['codigo']} liberada tras control de antracnosis (incidencia #{inc_ref['id']}).")
    L["obs"] = obs
    if key == LOTE_REF:
        w(f"UPDATE produccion.lote SET estado = {q(L['estado'])}, observaciones = {q(obs)}, registrado_por = 'proyecto', "
          f"creado_en = {q(L['creado'])}, actualizado_en = {q(L['cerrado'])} WHERE id = {LOTE_REF_ID};")
    else:
        lote_rows.append((L["id"], L["codigo"], L["anio"], L["sec"], L["estado"], obs, "proyecto", L["creado"],
                          L["cerrado"] if L["estado"] == "cerrado" else L["creado"]))
bulk("produccion.lote", ["id", "codigo", "anio", "secuencia", "estado", "observaciones", "registrado_por",
                         "creado_en", "actualizado_en"], lote_rows)

bulk("produccion.cosecha", ["id", "cama_id", "siembra_id", "lote_id", "fecha", "tallos", "calidad",
                            "registrado_por", "creado_en"],
     [(c["id"], c["cama"]["id"], c["siembra"]["id"], c["lote_id"], c["fecha"], c["tallos"], c["calidad"],
       "proyecto", c["creado"]) for c in cosechas])

bulk("produccion.labor", ["id", "cama_id", "siembra_id", "tipo", "fecha", "descripcion", "responsable",
                          "registrado_por", "creado_en"],
     [(i, l[0]["id"], l[1]["id"] if l[1] else None, l[2], l[3], l[4], l[5], "proyecto",
       ts(l[3], 8 + (i % 8), (i * 13) % 60)) for i, l in enumerate(labores, start=1)])

bulk("calidad.incidencia", ["id", "cama_id", "siembra_id", "tipo", "nombre", "severidad", "estado",
                            "detectada_en", "descripcion", "registrado_por", "creado_en", "actualizado_en"],
     [(i["id"], i["cama"]["id"], i["siembra"]["id"] if i["siembra"] else None, i["tipo"], i["nombre"], i["sev"],
       i["estado"], i["fecha"], i["desc"], "calidad", ts(i["fecha"], 9, 30),
       ts(i["resuelta_en"], 16, 0) if i["resuelta_en"] else ts(i["fecha"], 9, 30)) for i in incidencias])
trats = []
tid = 1
for inc in sorted(incidencias, key=lambda x: x["id"]):
    for t in inc["trat"]:
        trats.append((tid, inc["id"], t["producto"], t["dosis"], t["fecha"], t["resp"], t["obs"], "calidad",
                      ts(t["fecha"], 11, 0)))
        tid += 1
bulk("calidad.tratamiento", ["id", "incidencia_id", "producto", "dosis", "fecha_aplicacion", "responsable",
                             "observaciones", "registrado_por", "creado_en"], trats)
bulk("calidad.inspeccion", ["id", "cama_id", "fecha", "resultado", "puntaje", "observaciones", "inspector",
                            "registrado_por", "creado_en"],
     [(i, x[0]["id"], x[1], x[2], x[3], x[4], x[5], "calidad", ts(x[1], 10, (i * 7) % 60))
      for i, x in enumerate(inspecciones, start=1)])

bulk("ventas.cliente", ["id", "nombre", "nit", "tipo", "email", "telefono", "ciudad", "activo", "creado_en",
                        "actualizado_en"],
     [(c["id"], c["nombre"], c["nit"], c["tipo"], c["email"], c["tel"], c["ciudad"], c["hasta"] is None,
       ts(c["desde"], 9, 0), ts(c["hasta"] or c["desde"], 9, 0)) for c in clientes])
bulk("ventas.orden", ["id", "cliente_id", "fecha", "estado", "observaciones", "registrado_por", "creado_en",
                      "actualizado_en"],
     [(o["id"], o["cli"]["id"], o["fecha"], o["estado"], o["obs"], "comercial", o["creado"], o["creado"])
      for o in ordenes])
bulk("ventas.orden_item", ["id", "orden_id", "lote_id", "tallos", "precio_por_tallo"],
     [(i["id"], i["orden"]["id"], i["lote_id"], i["tallos"], i["precio"]) for i in items])
bulk("ventas.despacho", ["id", "orden_id", "fecha", "estado", "transportador", "guia", "observaciones",
                         "registrado_por", "creado_en", "actualizado_en"],
     [(d["id"], d["orden"]["id"], d["fecha"], d["estado"], d["transp"], d["guia"], d["obs"], "comercial",
       d["creado"], d["creado"]) for d in despachos])
bulk("ventas.despacho_item", ["id", "despacho_id", "orden_item_id", "tallos"],
     [(d["id"], d["desp"]["id"], d["item"]["id"], d["tallos"]) for d in ditems])

# ---------------------------------------------------------------- lecturas IoT (en el servidor)
w(r"""
-- Lecturas IoT: horarias desde 2022-01-01 y cada 15 min los últimos 30 días.
-- Clima: bimodal andino (lluvias abr-may y oct-nov), La Niña 2022, El Niño 2023-24,
-- ciclo diario, riego (diente de sierra) y fertirriego quincenal; ~1 % de días sin señal.
SELECT setseed(0.2026);
WITH instantes AS (
  SELECT g AS t FROM generate_series(timestamptz '2022-01-01 00:00-05',
                                     date_trunc('hour', now()) - interval '30 days', interval '1 hour') g
  UNION ALL
  SELECT g FROM generate_series(date_trunc('hour', now()) - interval '30 days' + interval '15 minutes',
                                date_trunc('minute', now()) - (extract(minute FROM now())::int % 15) * interval '1 minute',
                                interval '15 minutes') g
),
base AS (
  SELECT n.id AS nodo_id, n.cama_id, c.zona, c.codigo, i.t,
         extract(hour FROM i.t AT TIME ZONE 'America/Bogota') + extract(minute FROM i.t AT TIME ZONE 'America/Bogota') / 60.0 AS h,
         (i.t AT TIME ZONE 'America/Bogota')::date AS d,
         extract(epoch FROM i.t) / 3600.0 AS eh
  FROM monitoreo.nodo n JOIN produccion.cama c ON c.id = n.cama_id CROSS JOIN instantes i
),
clima AS (
  SELECT b.*,
    greatest(0, least(1, 0.5 + 0.5 * cos(2 * pi() * (extract(doy FROM b.d) - 118) / 182.6)
      + CASE WHEN b.d BETWEEN '2021-10-01' AND '2023-02-28' THEN 0.22
             WHEN b.d BETWEEN '2023-06-01' AND '2024-04-30' THEN -0.30 ELSE 0 END)) AS ll,
    CASE WHEN b.d BETWEEN '2021-10-01' AND '2023-02-28' THEN -0.5
         WHEN b.d BETWEEN '2023-06-01' AND '2024-04-30' THEN 1.4 ELSE 0.1 END AS enso_t,
    CASE b.zona WHEN 'A' THEN 0 WHEN 'B' THEN 0.5 ELSE 1.1 END AS z_t,
    sin(2 * pi() * (b.h - 9) / 24) AS diurno,
    (random() + random() + random() - 1.5) AS r1,
    (random() + random() + random() - 1.5) AS r2,
    (random() + random() - 1) AS r3
  FROM base b
  WHERE abs(hashtext(b.nodo_id::text || b.d::text)::bigint) % 1000 >= 11
    AND NOT (b.codigo = 'B-07' AND b.t > now() - interval '50 hours')
)
INSERT INTO monitoreo.lectura (nodo_id, cama_id, leido_en, temperatura, humedad_relativa, humedad_suelo, ph, conductividad_electrica)
SELECT nodo_id, cama_id, t,
  round((18.6 + z_t + enso_t - 1.1 * ll + (5.2 - 1.6 * ll) * diurno + 1.3 * r1
         + CASE WHEN extract(month FROM d) IN (1, 2) AND diurno < -0.6 AND ll < 0.35 THEN -2.2 ELSE 0 END)::numeric, 2),
  round(greatest(38, least(99, 78 + 11 * ll - (13 - 4 * ll) * diurno
         - CASE WHEN enso_t > 1 THEN 7 ELSE 0 END + 4 * r2))::numeric, 2),
  round(greatest(18, least(82, 44 + 14 * ll - CASE WHEN enso_t > 1 THEN 7 ELSE 0 END
         + 9 * cos(2 * pi() * ((eh + cama_id * 7) % 84) / 84) + 3 * r1
         - CASE WHEN codigo = 'C-06' AND t > now() - interval '14 hours' THEN 20 ELSE 0 END))::numeric, 2),
  round((6.2 + CASE zona WHEN 'C' THEN -0.22 WHEN 'B' THEN 0.05 ELSE 0 END
         + 0.14 * sin(2 * pi() * extract(doy FROM d) / 365.0 + cama_id) - 0.08 * ll + 0.06 * r3)::numeric, 2),
  round((0.95 + 0.55 * exp(-((eh + cama_id * 11) % 336) / 40.0) + 0.18 * (1 - ll) + 0.05 * r2)::numeric, 2)
FROM clima;

UPDATE monitoreo.nodo n SET
  ultima_conexion = (SELECT max(leido_en) FROM monitoreo.lectura l WHERE l.nodo_id = n.id),
  estado = CASE c.codigo WHEN 'B-07' THEN 'offline' WHEN 'C-06' THEN 'alerta' ELSE 'activo' END,
  firmware = CASE c.codigo WHEN 'B-07' THEN '1.4.2' WHEN 'C-08' THEN '1.5.0' ELSE '1.6.1' END
FROM produccion.cama c WHERE c.id = n.cama_id;
""")

for tabla in ["produccion.siembra", "produccion.lote", "produccion.cosecha", "produccion.labor",
              "calidad.incidencia", "calidad.tratamiento", "calidad.inspeccion", "ventas.cliente",
              "ventas.orden", "ventas.orden_item", "ventas.despacho", "ventas.despacho_item"]:
    w(f"SELECT setval(pg_get_serial_sequence('{tabla}', 'id'), (SELECT max(id) FROM {tabla}));")
w("ANALYZE;")

with open(sys.argv[1], "w", encoding="utf-8", newline="\n") as fh:
    fh.write("\n".join(out) + "\n")

# resumen
tot_cos = sum(c["tallos"] for c in cosechas)
print("siembras", len(siembras), "activas", sum(s["estado"] == "activa" for s in siembras),
      "canceladas", sum(s["estado"] == "cancelada" for s in siembras))
print("cosechas", len(cosechas), "tallos", tot_cos, "lotes", len(lotes))
print("labores", len(labores), "incidencias", len(incidencias), "tratamientos", len(trats),
      "inspecciones", len(inspecciones))
print("clientes", len(clientes), "ordenes", len(ordenes), "items", len(items), "despachos", len(despachos))
print("estados cama", dict(sorted(defaultdict(int, {k: list(estado_cama.values()).count(k) for k in set(estado_cama.values())}).items())))
print("ref camas", sorted(e["cama"]["codigo"] for e in cortes_ref), "cama incidencia", cama_ref["cama"]["codigo"])
neg = [(k, v) for k, v in stock.items() if v["primera"] < 0 or v["segunda"] < 0]
print("stock negativo", neg[:5])
vend = sum(i["tallos"] for i in items if i["orden"]["estado"] != "cancelada")
print("vendido", vend, "de", sum(c["tallos"] for c in cosechas if c["calidad"] != "descarte"))
ing = sum(i["tallos"] * i["precio"] for i in items if i["orden"]["estado"] != "cancelada")
print("ingresos COP", f"{ing:,}")
