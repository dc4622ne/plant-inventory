import { storageKeys } from './backupUtils';

export const plantSpacesStorageKey = storageKeys.plantSpaces;
export const plantWallSpaceId = 'space-plant-wall';
export const plantWallLocationValue = 'Plant Wall';

const defaultPlantWallSpace = {
  id: plantWallSpaceId,
  name: 'Plant Wall',
  description: 'Visual layout of the plants arranged on the plant wall.',
  backgroundImageUrl: '',
  backgroundDim: 42,
  locationValue: plantWallLocationValue,
  width: 100,
  height: 68,
  createdAt: '2026-07-15T00:00:00.000Z',
  updatedAt: '2026-07-15T00:00:00.000Z',
  placements: [],
};

const futureSpaceSeeds = [
  ['space-tc-nursery', 'TC Nursery', 'Tissue cultures and acclimating plants.', 'TC Nursery'],
  ['space-sunroom', 'Sunroom', 'Bright room layout for grouped plants.', 'Sunroom'],
  ['space-fireplace-hearth', 'Fireplace Hearth', 'Plants staged around the hearth.', 'Fireplace Hearth'],
  ['space-kitchen-window', 'Kitchen Window', 'Plants living near the kitchen light.', 'Kitchen Window'],
  ['space-office', 'Office', 'Workroom plant layout.', 'Office'],
  ['space-porch', 'Porch', 'Seasonal porch plant staging.', 'Porch'],
];

export function getDefaultPlantSpaces() {
  return [{ ...defaultPlantWallSpace, placements: [] }];
}

export function getPlannedPlantSpaces() {
  return futureSpaceSeeds.map(([id, name, description, locationValue]) => ({
    id,
    name,
    description,
    locationValue,
    comingSoon: true,
  }));
}

function finitePercent(value, fallback, min = 0, max = 100) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

export function normalizePlantPlacement(rawPlacement = {}, index = 0) {
  const now = new Date().toISOString();
  return {
    ...rawPlacement,
    id: rawPlacement.id || `placement-${rawPlacement.plantId || index}-${index}`,
    plantId: String(rawPlacement.plantId || ''),
    x: finitePercent(rawPlacement.x, 4 + (index % 5) * 18, 0, 96),
    y: finitePercent(rawPlacement.y, 6 + Math.floor(index / 5) * 18, 0, 96),
    width: finitePercent(rawPlacement.width, 16, 8, 42),
    height: finitePercent(rawPlacement.height, 18, 8, 42),
    zIndex: Number.isFinite(Number(rawPlacement.zIndex)) ? Number(rawPlacement.zIndex) : index + 1,
    shelf: rawPlacement.shelf || rawPlacement.zone || '',
    createdAt: rawPlacement.createdAt || now,
    updatedAt: rawPlacement.updatedAt || rawPlacement.createdAt || now,
  };
}

export function normalizePlantSpace(rawSpace = {}, index = 0) {
  const fallback = index === 0 ? defaultPlantWallSpace : {};
  const now = new Date().toISOString();
  const placements = Array.isArray(rawSpace.placements) ? rawSpace.placements : [];

  return {
    ...fallback,
    ...rawSpace,
    id: rawSpace.id || fallback.id || `space-${index}-${String(rawSpace.name || 'custom').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name: rawSpace.name || fallback.name || 'Custom Space',
    description: rawSpace.description || fallback.description || '',
    backgroundImageUrl: rawSpace.backgroundImageUrl || '',
    backgroundDim: finitePercent(rawSpace.backgroundDim, fallback.backgroundDim ?? 35, 0, 80),
    locationValue: rawSpace.locationValue || fallback.locationValue || rawSpace.name || '',
    width: finitePercent(rawSpace.width, fallback.width || 100, 20, 300),
    height: finitePercent(rawSpace.height, fallback.height || 68, 20, 300),
    createdAt: rawSpace.createdAt || fallback.createdAt || now,
    updatedAt: rawSpace.updatedAt || fallback.updatedAt || rawSpace.createdAt || now,
    placements: placements
      .map(normalizePlantPlacement)
      .filter((placement) => placement.plantId),
  };
}

export function normalizePlantSpaces(rawSpaces) {
  const savedSpaces = Array.isArray(rawSpaces) ? rawSpaces : [];
  const normalized = savedSpaces.map(normalizePlantSpace);
  const hasPlantWall = normalized.some((space) => space.id === plantWallSpaceId);

  return hasPlantWall
    ? normalized
    : [normalizePlantSpace(defaultPlantWallSpace, 0), ...normalized];
}

export function loadPlantSpaces() {
  try {
    return normalizePlantSpaces(JSON.parse(localStorage.getItem(plantSpacesStorageKey) || '[]'));
  } catch {
    return getDefaultPlantSpaces();
  }
}
