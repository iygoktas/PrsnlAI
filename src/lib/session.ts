export interface SessionUser {
  userId: string;
  orgId: string;
  role: 'ADMIN' | 'MANAGER' | 'VIEWER';
  name: string;
  email: string;
}

const KEY = 'kb_session';

export function saveSession(user: SessionUser): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(user));
}

export function loadSession(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
}
