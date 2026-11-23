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
import { NodosPage } from "../../modules/monitoreo/pages/NodosPage";
import { LecturasPage } from "../../modules/monitoreo/pages/LecturasPage";
import { UmbralesPage } from "../../modules/monitoreo/pages/UmbralesPage";
import { IncidenciasPage } from "../../modules/calidad/pages/IncidenciasPage";
import { TratamientosPage } from "../../modules/calidad/pages/TratamientosPage";
import { InspeccionesPage } from "../../modules/calidad/pages/InspeccionesPage";
import { ClientesPage } from "../../modules/comercial/pages/ClientesPage";
import { OrdenesPage } from "../../modules/comercial/pages/OrdenesPage";
import { DespachosPage } from "../../modules/comercial/pages/DespachosPage";
import { AnaliticaPage } from "../../modules/analitica/AnaliticaPage";
import { NotFoundPage } from "../../shared/ui/NotFoundPage";

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
          <Route path="monitoreo" element={<Navigate to="/monitoreo/nodos" replace />} />
          <Route path="monitoreo/nodos" element={<NodosPage />} />
          <Route path="monitoreo/lecturas" element={<LecturasPage />} />
          <Route path="monitoreo/umbrales" element={<UmbralesPage />} />
          <Route path="calidad" element={<Navigate to="/calidad/incidencias" replace />} />
          <Route path="calidad/incidencias" element={<IncidenciasPage />} />
          <Route path="calidad/tratamientos" element={<TratamientosPage />} />
          <Route path="calidad/inspecciones" element={<InspeccionesPage />} />
          <Route path="trazabilidad/*" element={<TrazabilidadPage />} />
          <Route path="comercial" element={<Navigate to="/comercial/clientes" replace />} />
          <Route path="comercial/clientes" element={<ClientesPage />} />
          <Route path="comercial/ordenes" element={<OrdenesPage />} />
          <Route path="comercial/despachos" element={<DespachosPage />} />
          <Route path="analitica" element={<AnaliticaPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
