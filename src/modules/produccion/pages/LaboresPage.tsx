import { ModulePage } from "../../../shared/ui/ModulePage";

export function LaboresPage() {
  return (
    <ModulePage
      title="Labores"
      description="Registro de labores por cama o siembra."
      includes={["Labores por cama", "Labores por siembra", "Historial de labores"]}
    />
  );
}
