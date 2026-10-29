import { ApiError } from "./errors";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:3000";

export interface ApiHealth {
  status: "ok";
  database: "connected";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(response.status, await response.text());
  }

  return (await response.json()) as T;
}

export function getHealth(signal?: AbortSignal) {
  return request<ApiHealth>("/health", { signal });
}
