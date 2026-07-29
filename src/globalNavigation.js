export const globalNavigationDestinations = [
  { id: 'dashboard', label: 'Dashboard', icon: '⌂', category: 'plants' },
  { id: 'plant-list', label: 'Plant List', icon: '🪴', category: 'plants' },
  { id: 'add-plant', label: 'Add Plant', icon: '+', category: 'plants' },
  { id: 'plant-journal', label: 'Plant Journal', icon: '✎', category: 'tracking' },
  { id: 'check-ins', label: 'Check-ins', icon: '✓', category: 'tracking' },
  { id: 'plant-health', label: 'Plant Health', icon: '♥', category: 'tracking' },
  { id: 'plant-spaces', label: 'Plant Spaces', icon: '▦', category: 'plants' },
  { id: 'wishlist', label: 'Wishlist', icon: '♡', category: 'plants' },
  { id: 'garden', label: 'Garden Beds', icon: '♧', category: 'plants' },
  { id: 'resources', label: 'Resources', icon: '⌑', category: 'app' },
  { id: 'settings', label: 'Settings', icon: '⚙', category: 'app' },
  { id: 'about', label: 'About', icon: 'i', category: 'app' },
];

export const globalNavigationGroups = ['plants', 'tracking', 'app'].map((id) => ({
  id,
  items: globalNavigationDestinations.filter((item) => item.category === id),
}));

export function globalNavigationItems() {
  return [...globalNavigationDestinations];
}

export function hasDuplicateNavigationDestinations(items = globalNavigationDestinations) {
  const ids = items.map(({ id }) => id);
  return new Set(ids).size !== ids.length;
}

export function activeNavigationDestination({
  appView,
  isAddingPlant = false,
  isEditingPlant = false,
}) {
  if (isAddingPlant) return 'add-plant';
  if (isEditingPlant) return 'plant-list';
  return {
    dashboard: 'dashboard',
    plants: 'plant-list',
    wishlist: 'wishlist',
    garden: 'garden',
    'plant-spaces': 'plant-spaces',
    reminders: 'check-ins',
    'quick-notes': 'plant-journal',
    resources: 'resources',
    settings: 'settings',
    about: 'about',
  }[appView] || '';
}
