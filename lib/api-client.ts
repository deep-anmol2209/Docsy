

export class ApiClientError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.details = details;
  }
}

type ApiEnvelope<T> =
  | { success: true; data: T; message?: string }
  | { success: false; message: string; details?: unknown };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init?.body && !(init.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
      ...init?.headers,
    },
  });
  console.log("[API Client] Path:", path);
  console.log("[API Client] Init:", init);
  console.log("[API Client] Response:", response);

  // Deletes return 204 with no body — nothing to parse.
  if (response.status === 204) {
    return undefined as T;
  }

  let json: ApiEnvelope<T>;
  try {
    json = (await response.json()) as ApiEnvelope<T>;
  } catch {
    throw new ApiClientError(
      response.ok ? "Received an unexpected response." : response.statusText,
      response.status,
    );
  }

  if (!json.success) {
    throw new ApiClientError(json.message, response.status, json.details);
  }

  return json.data;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body:
        body instanceof FormData
          ? body
          : body !== undefined
            ? JSON.stringify(body)
            : undefined,
    }),

  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),

  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
