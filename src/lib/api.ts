const IS_SERVER = typeof window === "undefined";

export function getLocalToken(): string | null {
  if (IS_SERVER) return null;
  return localStorage.getItem("access_token");
}

export function saveLocalToken(token: string) {
  if (!IS_SERVER) {
    localStorage.setItem("access_token", token);
  }
}

export function removeLocalToken() {
  if (!IS_SERVER) {
    localStorage.removeItem("access_token");
  }
}

export function getLocalUser() {
  if (IS_SERVER) return null;
  const userStr = localStorage.getItem("user");
  try {
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
}

export function saveLocalUser(user: any) {
  if (!IS_SERVER) {
    localStorage.setItem("user", JSON.stringify(user));
  }
}

export function removeLocalUser() {
  if (!IS_SERVER) {
    localStorage.removeItem("user");
  }
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getLocalToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Intentar refrescar o desloguear si expira
    removeLocalToken();
    removeLocalUser();
    if (!IS_SERVER) {
      window.dispatchEvent(new Event("auth-change"));
    }
  }

  return response;
}
