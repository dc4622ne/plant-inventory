import { storageKeys } from './backupUtils.js';

export const plantSpacesStorageKey = storageKeys.plantSpaces;
export const plantWallSpaceId = 'space-plant-wall';
export const plantWallLocationValue = 'Plant Wall';
export const plantSpaceDisplayModes = ['auto', 'compact-label', 'photo-card', 'full-card'];

function normalizeDisplayMode(value) {
  return plantSpaceDisplayModes.includes(value) ? value : 'auto';
}

const defaultPlantWallSpace = {
  id: plantWallSpaceId,
  name: 'Plant Wall',
  description: 'Visual layout of the plants arranged on the plant wall.',
  backgroundImageUrl: '',
  backgroundDim: 42,
  locationValue: plantWallLocationValue,
  width: 100,
  height: 68,
  defaultDisplayMode: 'auto',
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
  const placement = rawPlacement && typeof rawPlacement === 'object' && !Array.isArray(rawPlacement)
    ? rawPlacement
    : {};
  const now = new Date().toISOString();
  return {
    ...placement,
    id: placement.id || `placement-${placement.plantId || index}-${index}`,
    plantId: String(placement.plantId || ''),
    x: finitePercent(placement.x, 4 + (index % 5) * 18, 0, 96),
    y: finitePercent(placement.y, 6 + Math.floor(index / 5) * 18, 0, 96),
    width: finitePercent(placement.width, 16, 8, 42),
    height: finitePercent(placement.height, 18, 8, 42),
    zIndex: Number.isFinite(Number(placement.zIndex)) ? Number(placement.zIndex) : index + 1,
    displayMode: normalizeDisplayMode(placement.displayMode),
    shelf: placement.shelf || placement.zone || '',
    createdAt: placement.createdAt || now,
    updatedAt: placement.updatedAt || placement.createdAt || now,
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
    defaultDisplayMode: normalizeDisplayMode(rawSpace.defaultDisplayMode),
    createdAt: rawSpace.createdAt || fallback.createdAt || now,
    updatedAt: rawSpace.updatedAt || fallback.updatedAt || rawSpace.createdAt || now,
    placements: placements
      .map(normalizePlantPlacement)
      .filter((placement) => placement.plantId),
  };
}

function reportMalformedSpace(code, index) {
  console.warn('[plant-tracker:plant-spaces]', { code, index, action: 'record_skipped' });
}

export function normalizePlantSpaces(rawSpaces, { ensureDefault = true } = {}) {
  const savedSpaces = Array.isArray(rawSpaces) ? rawSpaces : [];
  if (!Array.isArray(rawSpaces) && rawSpaces != null) reportMalformedSpace('COLLECTION_NOT_ARRAY', -1);
  const normalized = savedSpaces.flatMap((space, index) => {
    if (!space || typeof space !== 'object' || Array.isArray(space)) {
      reportMalformedSpace('RECORD_NOT_OBJECT', index); return [];
    }
    if (!String(space.id || space.name || '').trim()) {
      reportMalformedSpace('RECORD_MISSING_IDENTITY', index); return [];
    }
    return [normalizePlantSpace(space, index)];
  });
  const hasPlantWall = normalized.some((space) => space.id === plantWallSpaceId);

  return !ensureDefault || hasPlantWall
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
