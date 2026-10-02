export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  total?: number;
}

export class ApiError extends Error {
  public status: number;
  public data?: any;

  constructor(message: string, status: number = 500, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '';

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${endpoint}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const config: RequestInit = {
    ...options,
    headers,
    credentials: 'include', // Garantiza el paso de cookies HTTP-Only de autenticación del Core
  };

  try {
    const response = await fetch(url, config);

    let json: any = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      json = await response.json();
    } else {
      const text = await response.text();
      if (!response.ok) {
        json = { success: false, message: text };
      } else {
        throw new ApiError(
          'Respuesta inesperada del servidor (contenido no JSON). Verifique la conexión con el backend.',
          response.status,
          { raw: text }
        );
      }
    }

    if (!response.ok) {
      const errorMessage =
        json?.error ||
        json?.message ||
        `Error del servidor (${response.status}: ${response.statusText})`;
      throw new ApiError(errorMessage, response.status, json);
    }

    return json as ApiResponse<T>;
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Error de red o conexión
    console.error(`[API Network Error] ${options.method || 'GET'} ${url}:`, error);
    throw new ApiError(
      error.message || 'No se pudo conectar con el servidor local.',
      0
    );
  }
}

export const apiClient = {
  get<T = any>(endpoint: string, headers?: HeadersInit): Promise<ApiResponse<T>> {
    return request<T>(endpoint, { method: 'GET', headers });
  },

  post<T = any>(endpoint: string, body?: any, headers?: HeadersInit): Promise<ApiResponse<T>> {
    return request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    });
  },

  put<T = any>(endpoint: string, body?: any, headers?: HeadersInit): Promise<ApiResponse<T>> {
    return request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    });
  },

  patch<T = any>(endpoint: string, body?: any, headers?: HeadersInit): Promise<ApiResponse<T>> {
    return request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    });
  },

  delete<T = any>(endpoint: string, headers?: HeadersInit): Promise<ApiResponse<T>> {
    return request<T>(endpoint, { method: 'DELETE', headers });
  },
};
