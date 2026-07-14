import { soilMixGuide } from './soilMixGuide';

export const resources = [
  soilMixGuide,
];

export const soilMixGuideResourceId = soilMixGuide.id;

export const soilMixRecipes = soilMixGuide.sections
  .find((section) => section.id === 'soil-recipes')?.recipes || [];

export const soilMixOptions = soilMixRecipes.map((recipe) => ({
  value: recipe.id,
  label: recipe.name,
}));

const legacySoilMixAliases = new Map([
  ['base mix', 'base-mix'],
  ['chunky aroid mix', 'chunky-aroid-mix'],
  ['anthurium mix', 'anthurium-mix'],
  ['alocasia mix', 'alocasia-mix'],
  ['moisture mix', 'moisture-mix'],
  ['african violet mix', 'african-violet-mix'],
  ['lipstick plant mix', 'lipstick-plant-mix'],
  ['dry mix', 'dry-mix'],
  ['christmas cactus mix', 'christmas-cactus-mix'],
  ['jewel orchid mix', 'jewel-orchid-mix'],
  ['tc / propagation mix', 'tc-propagation-mix'],
  ['tc /propagation mix', 'tc-propagation-mix'],
  ['tc propagation mix', 'tc-propagation-mix'],
  ['semi-hydro', 'semi-hydro'],
  ['semi-hydro / leca', 'semi-hydro'],
]);

function normalizedSoilMixValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function getResourceById(resourceId) {
  return resources.find((resource) => resource.id === resourceId);
}

export function getSoilMixById(mixId) {
  return soilMixRecipes.find((recipe) => recipe.id === mixId);
}

export function getSoilMixByName(mixName) {
  const normalizedName = normalizedSoilMixValue(mixName);
  const aliasedId = legacySoilMixAliases.get(normalizedName);

  if (aliasedId) return getSoilMixById(aliasedId);

  return soilMixRecipes.find((recipe) => normalizedSoilMixValue(recipe.name) === normalizedName);
}

export function getSoilMixByValue(value) {
  return getSoilMixById(value) || getSoilMixByName(value);
}

export function getSoilMixDisplayName(value) {
  return getSoilMixByValue(value)?.name || value || '';
}
