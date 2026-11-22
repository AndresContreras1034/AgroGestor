import { ModulePage } from "../../../shared/ui/ModulePage";

export function SiembrasPage() {
  return (
    <ModulePage
      title="Siembras"
      description="Registro de siembras por cama."
      includes={["Nueva siembra", "Siembras activas", "Cancelación"]}
    />
  );
}
