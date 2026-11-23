// base/admin.js
export const ADMIN_UUID = "ec7d442d-a449-459d-80f6-9ad1ed2ff507";

export function esAdmin(user) {
  return Boolean(user && user.id === ADMIN_UUID);
}