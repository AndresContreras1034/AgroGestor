export interface NavigationItem {
  to: string;
  label: string;
  end?: boolean;
}

export interface NavigationGroup {
  label: string;
  items: NavigationItem[];
}

export const NAVIGATION_GROUPS: NavigationGroup[] = [
  {
    label: "General",
    items: [{ to: "/", label: "Inicio", end: true }],
  },
  {
    label: "Finca",
    items: [{ to: "/plano", label: "Plano" }],
  },
  {
    label: "Producción",
    items: [
      { to: "/produccion/camas", label: "Camas" },
      { to: "/produccion/siembras", label: "Siembras" },
      { to: "/produccion/labores", label: "Labores" },
      { to: "/produccion/cosechas", label: "Cosechas" },
      { to: "/produccion/lotes", label: "Lotes" },
    ],
  },
  {
    label: "Seguimiento",
    items: [
      { to: "/monitoreo/nodos", label: "Monitoreo IoT" },
      { to: "/calidad/incidencias", label: "Calidad" },
      { to: "/trazabilidad", label: "Trazabilidad" },
    ],
  },
  {
    label: "Comercial",
    items: [{ to: "/comercial/clientes", label: "Comercial" }],
  },
  {
    label: "Control",
    items: [
      { to: "/analitica", label: "Analítica" },
      { to: "/simulacion", label: "Iniciar simulación" },
    ],
  },
];

export function getNavigationContext(pathname: string) {
  for (const group of NAVIGATION_GROUPS) {
    const item = group.items.find(({ to, end }) =>
      end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`),
    );
    if (item) {
      return { group: group.label, label: item.label };
    }
  }

  if (pathname.startsWith("/monitoreo")) {
    return { group: "Seguimiento", label: "Monitoreo IoT" };
  }
  if (pathname.startsWith("/calidad")) {
    return { group: "Seguimiento", label: "Calidad" };
  }
  if (pathname.startsWith("/comercial")) {
    return { group: "Comercial", label: "Comercial" };
  }
  if (pathname.startsWith("/analitica")) {
    return { group: "Control", label: "Analítica" };
  }
  if (pathname.startsWith("/simulacion")) {
    return { group: "Control", label: "Iniciar simulación" };
  }

  return pathname.startsWith("/produccion")
    ? { group: "Producción", label: "Producción" }
    : { group: "General", label: "Inicio" };
}
