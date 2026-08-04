export const repositoryNames = Object.freeze([
  'plants', 'photos', 'journalEntries', 'checkIns', 'healthEvents', 'activityEvents',
  'cormEvents', 'tissueCultureEvents', 'lecaEvents', 'dashboardPreferences',
  'quickViews', 'dropdownOptions',
]);

export function createRepositoryRegistry(factory) {
  return Object.freeze(Object.fromEntries(repositoryNames.map((name) => [name, factory(name)])));
}
