export type UserRole = 'ROLE_ADMIN' | 'ROLE_OWNER' | 'ROLE_USER';

function decodeJwtPayload(token: string): any {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export function getUserRoles(): UserRole[] {
  const token = localStorage.getItem('accessToken');
  if (!token) return [];
  const payload = decodeJwtPayload(token);
  return payload?.roles ?? [];
}

export function isOwner(): boolean {
  return getUserRoles().includes('ROLE_OWNER');
}
