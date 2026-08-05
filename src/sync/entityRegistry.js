import { storageKeys } from '../backupUtils.js';
import { dashboardPreferencesStorageKey } from '../dashboardPreferences.js';
import { normalizePlantSpaces } from '../plantSpacesData.js';

export const synchronizedCollections = Object.freeze([
  { entityType: 'plant', storageKey: storageKeys.plants, kind: 'array' },
  { entityType: 'journal_entry', storageKey: storageKeys.quickNotes, kind: 'array' },
  { entityType: 'check_in', storageKey: storageKeys.reminders, kind: 'array' },
  { entityType: 'plant_space', storageKey: storageKeys.plantSpaces, kind: 'array' },
  { entityType: 'garden_bed', storageKey: storageKeys.gardenBeds, kind: 'array' },
  { entityType: 'wishlist_item', storageKey: storageKeys.wishlistItems, kind: 'array' },
  { entityType: 'quick_view', storageKey: storageKeys.quickViews, kind: 'array' },
  { entityType: 'dropdown_options', storageKey: storageKeys.dropdownOptions, kind: 'singleton' },
  { entityType: 'dashboard_preferences', storageKey: dashboardPreferencesStorageKey, kind: 'singleton' },
]);

export const deviceOnlyStorageKeys = Object.freeze([
  storageKeys.plantViewMode,
  storageKeys.plantPageSizes,
  storageKeys.clientId,
  'plant-inventory-plant-space-view-modes',
  'plant-inventory-quick-views-editable-migrated',
]);

const uuid = () => globalThis.crypto?.randomUUID?.() || `record-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const parse = (value, fallback) => { try { return value ? JSON.parse(value) : fallback; } catch { return fallback; } };
const stableId = (record) => String(record?.id || '').trim() || uuid();

export function readLocalEntities(storage = globalThis.localStorage) {
  const entities = [];
  synchronizedCollections.forEach((domain) => {
    const raw = parse(storage?.getItem(domain.storageKey), domain.kind === 'array' ? [] : {});
    if (domain.kind === 'array') {
      (Array.isArray(raw) ? raw : []).forEach((item) => {
        const entityId = stableId(item);
        entities.push({ entityType: domain.entityType, entityId, record: { ...item, id: entityId } });
      });
    } else {
      entities.push({ entityType: domain.entityType, entityId: 'singleton', record: raw && typeof raw === 'object' ? raw : {} });
    }
  });
  return entities;
}

export function writeEntitiesToCompatibilityStorage(entities, storage = globalThis.localStorage) {
  const byType = new Map();
  entities.filter((item) => !item.deletedAt).forEach((item) => {
    if (!byType.has(item.entityType)) byType.set(item.entityType, []);
    const source = item.record?.__syncPayload && typeof item.record.__syncPayload === 'object'
      ? item.record.__syncPayload : item.record;
    const record = { ...(source || {}) };
    if (item.entityId !== 'singleton' && !record.id) record.id = item.entityId;
    delete record.__syncEntityType; delete record.__syncEntityId; delete record.__syncPayload;
    if (item.entityId === 'singleton') { delete record.id; delete record.sync; delete record.createdAt; delete record.updatedAt; }
    byType.get(item.entityType).push(record);
  });
  let changed = false;
  synchronizedCollections.forEach((domain) => {
    let values = byType.get(domain.entityType) || [];
    if (domain.entityType === 'plant_space') values = normalizePlantSpaces(values, { ensureDefault: false });
    const serialized = JSON.stringify(domain.kind === 'array' ? values : values[0] || {});
    if (storage.getItem(domain.storageKey) !== serialized) { storage.setItem(domain.storageKey, serialized); changed = true; }
  });
  if (changed) {
    const event = (name) => typeof CustomEvent === 'function' ? new CustomEvent(name, { detail: { source: 'compatibility-hydration', queueMutation: false } }) : new Event(name);
    globalThis.dispatchEvent?.(event('plant-collection-change'));
    globalThis.dispatchEvent?.(event('plant-all-collections-change'));
  }
  return changed;
}

export function clearUserOwnedCompatibilityStorage(storage = globalThis.localStorage) {
  synchronizedCollections.forEach((domain) => storage.removeItem(domain.storageKey));
  globalThis.dispatchEvent?.(new Event('plant-collection-change'));
}
