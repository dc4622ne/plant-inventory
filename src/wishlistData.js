const text = (value) => String(value ?? '').trim();

export const wishlistViews = {
  active: 'active',
  converted: 'converted',
  all: 'all',
};

export function isConvertedWishlistItem(item) {
  return item?.converted === true || text(item?.desiredStatus).toLowerCase() === 'converted';
}

export function filterWishlistItemsByView(items, view = wishlistViews.active) {
  const wishlistItems = Array.isArray(items) ? items : [];
  if (view === wishlistViews.all) return wishlistItems;
  if (view === wishlistViews.converted) return wishlistItems.filter(isConvertedWishlistItem);
  return wishlistItems.filter((item) => !isConvertedWishlistItem(item));
}

export function getActiveWishlistItems(items) {
  return filterWishlistItemsByView(items, wishlistViews.active);
}

export function isTissueCultureWishlistItem(item) {
  const type = text(item?.type).toLowerCase();
  return type.includes('tissue culture') || /\btc\b/.test(type);
}

export function createPlantFromWishlistItem(item, plantDefaults, getPlantImage) {
  const tissueCulture = isTissueCultureWishlistItem(item);
  return {
    ...plantDefaults,
    id: `wishlist-${item.id}`,
    name: item.name,
    genus: item.genus,
    type: item.type,
    source: item.source,
    acquiredDate: item.actualArrivalDate || item.expectedArrivalDate,
    imageUrl: item.imageUrl,
    careNote: item.notes,
    purchasePrice: item.price,
    image: getPlantImage(item.name, item.type),
    ...(tissueCulture ? {
      origin: 'Tissue culture',
      startingStage: 'Tissue Culture',
      acquisitionMethod: 'Purchased',
      lifecycleStage: 'Tissue Culture',
    } : text(item?.type).toLowerCase().includes('corm') ? {
      origin: 'Corm',
      startingStage: 'Corm',
      acquisitionMethod: 'Purchased',
      lifecycleStage: 'Corm',
    } : {
      startingStage: 'Juvenile Houseplant',
      acquisitionMethod: 'Purchased',
      lifecycleStage: 'Juvenile Houseplant',
    }),
  };
}

export function getWishlistDashboardModel(items) {
  const activeItems = getActiveWishlistItems(items);
  return {
    count: activeItems.length,
    previewNames: activeItems.slice(0, 3).map((item) => item.name).filter(Boolean),
    targetView: wishlistViews.active,
  };
}
