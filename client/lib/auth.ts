// lib/auth.ts

export function isTokenValid(token: string | null): boolean {
  if (!token) return false;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    const payload = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const decoded = atob(payload);
    const data = JSON.parse(decoded);

    // JWT expiration is measured in seconds.
    if (typeof data.exp !== "number") return false;

    return data.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}