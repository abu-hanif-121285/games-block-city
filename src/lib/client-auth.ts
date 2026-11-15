"use client";

let memoryToken: string | null = null;

export function getSessionToken(): string | null {
  if (memoryToken) return memoryToken;
  try {
    const s = window.sessionStorage.getItem("bc_token");
    if (s) {
      memoryToken = s;
      return s;
    }
  } catch {
    // sessionStorage unavailable in restricted iframe
  }
  try {
    const l = window.localStorage.getItem("bc_token");
    if (l) {
      memoryToken = l;
      return l;
    }
  } catch {
    // localStorage unavailable in restricted iframe
  }
  return null;
}

export function setSessionToken(token: string | null) {
  memoryToken = token;
  try {
    if (token) window.sessionStorage.setItem("bc_token", token);
    else window.sessionStorage.removeItem("bc_token");
  } catch {
    // ignore storage restrictions
  }
  try {
    if (token) window.localStorage.setItem("bc_token", token);
    else window.localStorage.removeItem("bc_token");
  } catch {
    // ignore storage restrictions
  }
}

export function clearSessionToken() {
  setSessionToken(null);
}

export function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = getSessionToken();
  let url = input;
  const headers = new Headers(init.headers || undefined);

  if (token) {
    headers.set("X-BC-Token", token);
    if (!headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const sep = url.includes("?") ? "&" : "?";
    url = `${url}${sep}_t=${encodeURIComponent(token)}`;
  }

  return fetch(url, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store",
  });
}
