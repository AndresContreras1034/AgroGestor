import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "../layout/AppLayout";
import { DashboardPage } from "../../modules/dashboard/pages/DashboardPage";
import { ModulePage } from "../../shared/ui/ModulePage";
import { CamasPage } from "../../modules/produccion/pages/CamasPage";
import { SiembrasPage } from "../../modules/produccion/pages/SiembrasPage";
import { LaboresPage } from "../../modules/produccion/pages/LaboresPage";
import { CosechasPage } from "../../modules/produccion/pages/CosechasPage";
import { LotesPage } from "../../modules/produccion/pages/LotesPage";
import { PlanoPage } from "../../modules/plano/pages/PlanoPage";
import { TrazabilidadPage } from "../../modules/trazabilidad/pages/TrazabilidadPage";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="produccion/camas" element={<CamasPage />} />
          <Route path="produccion/siembras" element={<SiembrasPage />} />
          <Route path="produccion/labores" element={<LaboresPage />} />
          <Route path="produccion/cosechas" element={<CosechasPage />} />
          <Route path="produccion/lotes" element={<LotesPage />} />
          <Route
            path="plano/*"
            element={<PlanoPage />}
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
          <Route path="trazabilidad/*" element={<TrazabilidadPage />} />
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
