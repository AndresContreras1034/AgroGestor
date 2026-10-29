import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "../layout/AppLayout";
import { DashboardPage } from "../../modules/dashboard/pages/DashboardPage";
import { ModulePage } from "../../shared/ui/ModulePage";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route
            path="plano/*"
            element={
              <ModulePage
                title="Plano"
                description="Zonas, camas y distribución de la finca."
                includes={["Zonas A, B y C", "Posición de las 25 camas", "Capas y edición del plano"]}
              />
            }
          />
          <Route
            path="produccion/*"
            element={
              <ModulePage
                title="Producción"
                description="Operación agrícola y seguimiento de los lotes."
                includes={["Siembras", "Labores", "Cosechas", "Lotes"]}
              />
            }
          />
          <Route
            path="monitoreo/*"
            element={
              <ModulePage
                title="Monitoreo IoT"
                description="Nodos ESP32, lecturas y configuración de umbrales."
                includes={["Nodos por cama", "Lecturas", "Umbrales", "Ingesta HTTP"]}
              />
            }
          />
          <Route
            path="calidad/*"
            element={
              <ModulePage
                title="Calidad"
                description="Seguimiento fitosanitario e inspecciones."
                includes={["Incidencias", "Tratamientos", "Inspecciones"]}
              />
            }
          />
          <Route
            path="trazabilidad/*"
            element={
              <ModulePage
                title="Trazabilidad"
                description="Consulta de la historia del lote desde la cama hasta el cliente."
                includes={["Búsqueda de lotes", "Línea de tiempo", "Cadena de trazabilidad"]}
              />
            }
          />
          <Route
            path="comercial/*"
            element={
              <ModulePage
                title="Comercial"
                description="Gestión comercial relacionada con los lotes disponibles."
                includes={["Clientes", "Órdenes", "Despachos"]}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
