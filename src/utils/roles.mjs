export const ADMIN_ROLE = "administrador";
export const STUDENT_ROLE = "estudiante";
export const DELEGATION_ROLE = "delegacion";

const LEGACY_ROLE_ALIASES = new Map([
  ["delgacion", DELEGATION_ROLE],
]);

export const SUPPORTED_ROLES = [ADMIN_ROLE, STUDENT_ROLE, DELEGATION_ROLE];

export const normalizeRole = (role) =>
  String(role || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

export const toCanonicalRole = (role) => {
  const normalizedRole = normalizeRole(role);
  return LEGACY_ROLE_ALIASES.get(normalizedRole) || normalizedRole;
};

export const isSupportedRole = (role) => SUPPORTED_ROLES.includes(toCanonicalRole(role));

export const isAllowedRole = (role, allowedRoles) => {
  const canonicalRole = toCanonicalRole(role);
  const allowedRoleList = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  return allowedRoleList.map(toCanonicalRole).includes(canonicalRole);
};
