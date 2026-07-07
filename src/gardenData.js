export const gardenStorageKey = 'plant-inventory-garden-beds';

export function loadGardenBeds() {
  try {
    const data = JSON.parse(localStorage.getItem(gardenStorageKey) || '[]');
    return Array.isArray(data) ? data.map((bed) => ({
      name: '', location: '', size: '', sunExposure: '', notes: '', imageUrl: '',
      ...bed,
      crops: Array.isArray(bed.crops) ? bed.crops : [],
      activities: Array.isArray(bed.activities) ? bed.activities : [],
      harvests: Array.isArray(bed.harvests) ? bed.harvests : [],
    })) : [];
  } catch { return []; }
}

export function getGardenMetrics(beds) {
  const crops = beds.flatMap((bed) => bed.crops || []);
  const recentCutoff = new Date();
  recentCutoff.setDate(recentCutoff.getDate() - 30);
  const recentDate = recentCutoff.toISOString().slice(0, 10);
  return [
    { label: 'Garden beds', count: beds.length, filter: {} },
    { label: 'Active garden crops', count: crops.filter((crop) => !['Not set', 'Planned', 'Harvested', 'Failed / removed'].includes(crop.status)).length, filter: { active: true } },
    { label: 'Crops ready to harvest', count: crops.filter((crop) => crop.status === 'Ready to harvest').length, filter: { status: 'Ready to harvest' } },
    { label: 'Recent harvests', count: beds.flatMap((bed) => bed.harvests || []).filter((entry) => entry.date >= recentDate).length, filter: { recentHarvests: true } },
    { label: 'Crops with pest notes', count: crops.filter((crop) => crop.pestNotes?.trim()).length, filter: { pests: true } },
  ];
}
