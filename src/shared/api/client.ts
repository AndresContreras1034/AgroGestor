import { ApiError } from "./errors";
import type { Gestor } from "../types/gestor";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8787";

export interface ApiHealth {
  status: "ok";
  database: "connected";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body === undefined ? {} : { "Content-Type": "application/json" }),
        ...init?.headers,
      },
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") {
      throw cause;
    }
    throw new ApiError(0, "sin_conexion", "No se pudo conectar con el backend");
  }

  if (!response.ok) {
    let code = "desconocido";
    let message = `Error ${response.status}`;
    try {
      const body = await response.json();
      code = body?.error?.codigo ?? code;
      message = body?.error?.mensaje ?? message;
    } catch (cause) {
      if (!(cause instanceof SyntaxError)) {
        throw cause;
      }
    }
    throw new ApiError(response.status, code, message);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

type MetodoMutacion = "POST" | "PUT" | "PATCH" | "DELETE";

function mutar<T>(
  metodo: MetodoMutacion,
  path: string,
  actor: Gestor,
  body?: unknown,
  signal?: AbortSignal,
) {
  return request<T>(path, {
    method: metodo,
    headers: { "X-Gestor": actor },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
}

export function getHealth(signal?: AbortSignal) {
  return request<ApiHealth>("/health", { signal });
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal }),
  post: <T>(path: string, body: unknown, actor: Gestor, signal?: AbortSignal) =>
    mutar<T>("POST", path, actor, body, signal),
  put: <T>(path: string, body: unknown, actor: Gestor, signal?: AbortSignal) =>
    mutar<T>("PUT", path, actor, body, signal),
  patch: <T>(path: string, body: unknown, actor: Gestor, signal?: AbortSignal) =>
    mutar<T>("PATCH", path, actor, body, signal),
  delete: <T = void>(path: string, actor: Gestor, signal?: AbortSignal) =>
    mutar<T>("DELETE", path, actor, undefined, signal),
};
