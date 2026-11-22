import { ModulePage } from "../../../shared/ui/ModulePage";

export function CosechasPage() {
  return (
    <ModulePage
      title="Cosechas"
      description="Registro de cosechas por siembra y lote."
      includes={["Nueva cosecha", "Cosechas registradas", "Rendimiento por siembra"]}
    />
  );
}
