import { config } from "./config.js";
import { nodos } from "./nodos.js";
import { publishHttp } from "./publicadores/http.js";

console.info(
  `Simulador preparado para ${nodos.length} nodos. Endpoint: ${config.apiUrl}`,
);
console.info(
  "La generación de lecturas está pendiente; la API responderá 501 hasta implementarla.",
);

try {
  await publishHttp(config.apiUrl, { nodos });
} catch (error) {
  console.error("No se pudo conectar con la ingesta HTTP:", error);
  process.exitCode = 1;
}
