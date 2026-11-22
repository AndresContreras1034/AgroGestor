import { ModulePage } from "../../../shared/ui/ModulePage";

export function LotesPage() {
  return (
    <ModulePage
      title="Lotes"
      description="Agrupación de cosechas para trazabilidad."
      includes={["Lotes registrados", "Cosechas asociadas", "Trazabilidad"]}
    />
  );
}
