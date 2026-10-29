export const config = {
  apiUrl: process.env.INGESTA_URL ?? "http://127.0.0.1:3000/api/v1/monitoreo/ingesta",
  intervaloMs: Number(process.env.INTERVALO_MS ?? 60_000),
  numeroNodos: 25,
};

if (!Number.isInteger(config.intervaloMs) || config.intervaloMs < 1_000) {
  throw new Error("INTERVALO_MS debe ser un entero de al menos 1000 ms");
}
