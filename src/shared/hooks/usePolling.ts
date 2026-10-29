import { useEffect, useRef, useState } from "react";

interface PollingState<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
}

export function usePolling<T>(
  request: (signal: AbortSignal) => Promise<T>,
  intervalMs: number,
): PollingState<T> {
  const [state, setState] = useState<PollingState<T>>({
    data: null,
    error: null,
    loading: true,
  });
  const requestRef = useRef(request);
  requestRef.current = request;

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let currentRequest: AbortController | null = null;

    const poll = async () => {
      currentRequest = new AbortController();
      try {
        const data = await requestRef.current(currentRequest.signal);
        if (active) {
          setState({ data, error: null, loading: false });
        }
      } catch (cause) {
        if (active && !(cause instanceof DOMException && cause.name === "AbortError")) {
          setState((previous) => ({
            data: previous.data,
            error: cause instanceof Error ? cause : new Error("Error desconocido"),
            loading: false,
          }));
        }
      } finally {
        currentRequest = null;
        if (active) {
          timer = setTimeout(poll, intervalMs);
        }
      }
    };

    void poll();

    return () => {
      active = false;
      clearTimeout(timer);
      currentRequest?.abort();
    };
  }, [intervalMs]);

  return state;
}