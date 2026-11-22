interface BuscadorLoteProps {
  valor: string;
  onCambiar: (valor: string) => void;
}

export function BuscadorLote({ valor, onCambiar }: BuscadorLoteProps) {
  return (
    <label className="traz-buscador">
      <span>Buscar lote</span>
      <input
        type="search"
        value={valor}
        maxLength={40}
        placeholder="RSC-2026-014 o solo 014"
        onChange={(event) => onCambiar(event.target.value)}
      />
    </label>
  );
}
