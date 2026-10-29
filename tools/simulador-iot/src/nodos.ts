export const nodos = Array.from({ length: 25 }, (_, index) => {
  const numero = index + 1;
  const zona = numero <= 9 ? "A" : numero <= 17 ? "B" : "C";
  const numeroEnZona = zona === "A" ? numero : zona === "B" ? numero - 9 : numero - 17;

  return {
    nodoId: `NODO-${zona}-${String(numeroEnZona).padStart(2, "0")}`,
    camaId: `${zona}-${String(numeroEnZona).padStart(2, "0")}`,
  };
});
