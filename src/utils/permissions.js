import { useSelector } from 'react-redux';

// RBAC permission layer (frontend-first). Reads the resolved permissions object
// the backend delivers in `auth.user.permissions`:
//   { full: true }                                — owner/admin or no custom role
//   { full: false, modules, actions, hiddenData } — restricted by a custom role
//
// Defensive default: a missing/undefined permissions object (e.g. a login cached
// before this feature) is treated as FULL access — never lock a user out; the
// next getMe refresh delivers the real permissions.

// Build the helper API from a permissions object. Pure — usable outside React.
// `orgHiddenModules` — org-wide "Modullar ko'rinishi" toggle (Sozlamalar → Menyu):
// a module hidden here is hidden for EVERYONE, including owner/admin — it's a
// business config choice ("we don't use this module"), not a role restriction.
export function makePermissions(perm, orgHiddenModules = []) {
  const full = !perm || perm.full !== false;
  const modules = Array.isArray(perm?.modules) ? perm.modules : [];
  const actions = perm?.actions && typeof perm.actions === 'object' ? perm.actions : {};
  const hiddenData = Array.isArray(perm?.hiddenData) ? perm.hiddenData : [];
  const orgHidden = Array.isArray(orgHiddenModules) ? orgHiddenModules : [];

  return {
    full,
    // Can this sidebar module / submodule be shown? `dashboard` always visible
    // (unless explicitly org-hidden). Org-level hide always wins over role access.
    canSeeModule: (navKey) => {
      if (orgHidden.includes(navKey)) return false;
      return full || navKey === 'dashboard' || modules.includes(navKey);
    },
    // Is an action (view|create|edit|delete) allowed for a module?
    // Default-allow `view` so a visible module is at least readable.
    can: (navKey, action) => {
      if (full) return true;
      const a = actions[navKey];
      if (!a) return action === 'view';
      return !!a[action];
    },
    // Should a sensitive data field be hidden?
    isHidden: (dataKey) => !full && hiddenData.includes(dataKey),
  };
}

// React hook — binds to the current auth user's permissions.
export function usePermissions() {
  const perm = useSelector((s) => s.auth.user?.permissions);
  const orgHiddenModules = useSelector((s) => s.auth.user?.organization?.settings?.hiddenModules);
  return makePermissions(perm, orgHiddenModules);
}
