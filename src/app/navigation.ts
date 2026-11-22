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
      { to: "/monitoreo", label: "Monitoreo IoT" },
      { to: "/calidad", label: "Calidad" },
      { to: "/trazabilidad", label: "Trazabilidad" },
    ],
  },
  {
    label: "Comercial",
    items: [{ to: "/comercial", label: "Comercial" }],
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

  return pathname.startsWith("/produccion")
    ? { group: "Producción", label: "Producción" }
    : { group: "General", label: "Inicio" };
}
