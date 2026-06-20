const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function apiClient<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  videos: {
    import: (url: string, source: string, quality = "1080p") =>
      apiClient("/videos/import", {
        method: "POST",
        body: JSON.stringify({ url, source, quality }),
      }),
    list: () => apiClient("/videos"),
    get: (id: string) => apiClient(`/videos/${id}`),
    delete: (id: string) =>
      apiClient(`/videos/${id}`, { method: "DELETE" }),
  },
  ai: {
    transcribe: (videoId: string) =>
      apiClient(`/ai/transcribe/${videoId}`, { method: "POST" }),
    transcript: (videoId: string) => apiClient(`/ai/transcript/${videoId}`),
    jobStatus: (jobId: string) => apiClient(`/ai/jobs/${jobId}`),
  },
};
