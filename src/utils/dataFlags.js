// Catalog the Roles UI renders checkboxes from. Each DATA_FLAGS entry hides a
// specific field from API responses for roles that enable it (backend mirror:
// FLAG_FIELDS in backend/src/utils/permissions.js). Each OWN_SCOPES entry lets
// a role be restricted to only the records it created.
export const DATA_FLAGS = [
  { module: 'contacts', keys: ['contacts.phone', 'contacts.email'] },
  { module: 'funnels',  keys: ['deals.value'] },
];
export const DATA_FLAG_KEYS = DATA_FLAGS.flatMap(g => g.keys);

export const OWN_SCOPES = [
  { key: 'contacts', navKey: 'contacts' },
  { key: 'tasks',    navKey: 'tasks' },
  { key: 'deals',    navKey: 'funnels' },
];
