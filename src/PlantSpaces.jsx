import { useEffect, useMemo, useRef, useState } from 'react';
import ImageUploadField, { SafeImage } from './ImageUploadField';
import { uploadStoredImage } from './imageUploadUtils';
import { getPlannedPlantSpaces, plantSpaceDisplayModes, plantWallSpaceId } from './plantSpacesData';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function tileSize(placement) {
  return {
    width: clamp(Number(placement.width) || 16, 8, 42),
    height: clamp(Number(placement.height) || 18, 8, 42),
  };
}

function plantMatchesLocation(plant, locationValue) {
  return String(plant.location || '').trim().toLowerCase() === String(locationValue || '').trim().toLowerCase();
}

const spaceViewModeStorageKey = 'plant-inventory-plant-space-view-modes';

function isPhoneLikeViewport() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches
    && (window.innerWidth <= 930 || window.innerHeight <= 520);
}

function loadSpaceViewModes() {
  try {
    const saved = JSON.parse(localStorage.getItem(spaceViewModeStorageKey) || '{}');
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  } catch {
    return {};
  }
}

function isWithinDays(dateValue, days) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue || '')) return false;
  const start = new Date(`${dateValue}T00:00:00`);
  const today = new Date();
  const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const elapsedDays = Math.floor((localToday - start) / 86400000);
  return elapsedDays >= 0 && elapsedDays <= days;
}

const displayModeLabels = {
  auto: 'Auto',
  'compact-label': 'Compact Label',
  'photo-card': 'Photo Card',
  'full-card': 'Full Card',
};

function getTileStatuses(plant, reminders) {
  const statuses = [];
  const attention = String(plant.attention || '').toLowerCase();
  const quarantine = plant.pestQuarantineStartDate && !plant.pestQuarantineEndDate;
  const newPlantQuarantine = isWithinDays(plant.acquiredDate, 14);
  const activeReminder = reminders.some((reminder) => reminder.plantId === plant.id && reminder.status === 'active');
  const tcAcclimating = plant.type === 'Tissue Culture'
    && ['Deflasked', 'Community cup', 'High humidity acclimation', 'Venting', 'Transitioning to ambient'].includes(plant.tcStage || plant.status);
  const lecaTransitioning = ['Transitioning', 'Rooting'].includes(plant.lecaStatus);

  if (attention === 'high' || attention.includes('attention')) statuses.push({ code: '!', label: 'Needs attention', kind: 'attention' });
  if (quarantine) statuses.push({ code: 'Pest', label: 'Pest quarantine', kind: 'pest-quarantine' });
  if (newPlantQuarantine) statuses.push({ code: 'Q', label: 'Quarantine', kind: 'quarantine' });
  if (activeReminder) statuses.push({ code: 'Check', label: 'Active check-in', kind: 'reminder' });
  if (tcAcclimating) statuses.push({ code: 'TC', label: 'TC acclimating', kind: 'tc' });
  if (lecaTransitioning) statuses.push({ code: 'LECA', label: 'LECA transitioning', kind: 'leca' });

  return statuses;
}

function resolvePlacementDisplayMode(placement, activeSpace, { canvasViewMode, isEditingLayout, phoneLike }) {
  const requestedMode = placement.displayMode === 'auto'
    ? activeSpace.defaultDisplayMode || 'auto'
    : placement.displayMode || 'auto';

  if (requestedMode !== 'auto') return requestedMode;
  if (isEditingLayout || canvasViewMode === 'pan') return 'full-card';
  return phoneLike ? 'compact-label' : 'photo-card';
}

function firstOpenPlacement(existingCount) {
  const column = existingCount % 5;
  const row = Math.floor(existingCount / 5);
  return {
    x: clamp(4 + column * 18, 0, 82),
    y: clamp(6 + row * 18, 0, 78),
    width: 16,
    height: 18,
  };
}

function SpaceBackgroundEditor({ space, onSave }) {
  const [draftUrl, setDraftUrl] = useState(space.backgroundImageUrl || '');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('status');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDraftUrl(space.backgroundImageUrl || '');
    setFile(null);
    setPreviewUrl('');
    setMessage('');
  }, [space.id, space.backgroundImageUrl]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function selectFile(nextFile) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(nextFile);
    setPreviewUrl(nextFile ? URL.createObjectURL(nextFile) : '');
    setMessage('');
  }

  async function saveBackground() {
    setBusy(true);
    setMessage(file ? 'Uploading wall photo...' : 'Saving background...');
    setMessageType('status');
    try {
      const backgroundImageUrl = file ? await uploadStoredImage(file, 'plant-spaces') : draftUrl.trim();
      onSave({ backgroundImageUrl });
      setFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl('');
      setMessage('Background saved.');
    } catch (error) {
      setMessage(error.message || 'The background could not be saved. The current background was kept.');
      setMessageType('error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-background-editor">
      <ImageUploadField
        id="plant-space-background"
        label="Plant Wall background"
        value={draftUrl}
        onChange={(url) => {
          selectFile(null);
          setDraftUrl(url);
        }}
        onFileSelected={selectFile}
        selectedFileName={file?.name || ''}
        previewUrl={previewUrl}
        disabled={busy}
        message={message}
        messageType={messageType}
      />
      <div className="space-background-actions">
        <button type="button" onClick={saveBackground} disabled={busy}>Save Background</button>
        <button type="button" className="secondary-button" disabled={busy}
          onClick={() => onSave({ backgroundImageUrl: '' })}>
          Remove Background
        </button>
      </div>
    </div>
  );
}

export default function PlantSpaces({
  spaces,
  plants,
  reminders,
  dropdownOptions,
  focusSpaceId,
  focusPlantId,
  onChange,
  onPlantsChange,
  onOpenPlant,
  onFocusHandled,
}) {
  const [selectedSpaceId, setSelectedSpaceId] = useState(focusSpaceId || plantWallSpaceId);
  const [isEditingLayout, setIsEditingLayout] = useState(false);
  const [isAddingPlants, setIsAddingPlants] = useState(false);
  const [selectedPlacementId, setSelectedPlacementId] = useState('');
  const [highlightPlantId, setHighlightPlantId] = useState(focusPlantId || '');
  const [spaceSearch, setSpaceSearch] = useState('');
  const [chooserSearch, setChooserSearch] = useState('');
  const [chooserFilters, setChooserFilters] = useState({ genus: '', medium: '', status: '', attention: '' });
  const [selectedPlantIds, setSelectedPlantIds] = useState([]);
  const [spaceViewModes, setSpaceViewModes] = useState(loadSpaceViewModes);
  const [viewportTick, setViewportTick] = useState(0);
  const [isBackgroundEditorExpanded, setIsBackgroundEditorExpanded] = useState(false);
  const [previewPlantId, setPreviewPlantId] = useState('');
  const canvasRef = useRef(null);
  const canvasWrapRef = useRef(null);
  const compactPreviewRef = useRef(null);
  const tileRefs = useRef({});

  const plannedSpaces = useMemo(getPlannedPlantSpaces, []);
  const activeSpace = spaces.find((space) => space.id === selectedSpaceId) || spaces[0];
  const plantById = useMemo(() => new Map(plants.map((plant) => [plant.id, plant])), [plants]);
  const placedPlantIds = new Set((activeSpace?.placements || []).map((placement) => placement.plantId));
  const placedPlants = (activeSpace?.placements || []).map((placement) => plantById.get(placement.plantId)).filter(Boolean);
  const selectedPlacement = (activeSpace?.placements || []).find((placement) => placement.id === selectedPlacementId);
  const phoneLike = viewportTick >= 0 && isPhoneLikeViewport();
  const savedCanvasViewMode = spaceViewModes[activeSpace?.id] || '';
  const canvasViewMode = isEditingLayout ? 'pan' : (savedCanvasViewMode || (phoneLike ? 'fit' : 'pan'));
  const hasSavedBackground = Boolean(activeSpace?.backgroundImageUrl);
  const previewPlant = previewPlantId ? plantById.get(previewPlantId) : null;
  const previewStatuses = previewPlant ? getTileStatuses(previewPlant, reminders) : [];

  useEffect(() => {
    if (focusSpaceId) setSelectedSpaceId(focusSpaceId);
    if (focusPlantId) {
      setHighlightPlantId(focusPlantId);
      window.setTimeout(() => {
        tileRefs.current[focusPlantId]?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
      }, 120);
      const timer = window.setTimeout(() => {
        setHighlightPlantId('');
        onFocusHandled?.();
      }, 2600);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [focusSpaceId, focusPlantId, onFocusHandled]);

  useEffect(() => {
    function handleResize() {
      setViewportTick((tick) => tick + 1);
    }

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    const mediaQuery = window.matchMedia('(hover: none) and (pointer: coarse)');
    mediaQuery.addEventListener?.('change', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      mediaQuery.removeEventListener?.('change', handleResize);
    };
  }, []);

  useEffect(() => {
    setIsBackgroundEditorExpanded(!hasSavedBackground);
  }, [activeSpace?.id, hasSavedBackground]);

  useEffect(() => {
    if (!previewPlantId) return undefined;

    function handleDocumentPointerDown(event) {
      if (!compactPreviewRef.current?.contains(event.target)) setPreviewPlantId('');
    }

    function handleEscape(event) {
      if (event.key === 'Escape') setPreviewPlantId('');
    }

    document.addEventListener('pointerdown', handleDocumentPointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handleDocumentPointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [previewPlantId]);

  function saveSpace(nextSpace) {
    onChange(spaces.map((space) => (space.id === nextSpace.id ? { ...nextSpace, updatedAt: new Date().toISOString() } : space)));
  }

  function changeCanvasViewMode(nextMode) {
    const nextModes = { ...spaceViewModes, [activeSpace.id]: nextMode };
    setSpaceViewModes(nextModes);
    localStorage.setItem(spaceViewModeStorageKey, JSON.stringify(nextModes));
    window.setTimeout(() => {
      canvasWrapRef.current?.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
    }, 40);
  }

  function updatePlacements(nextPlacements) {
    saveSpace({ ...activeSpace, placements: nextPlacements });
  }

  function updatePlacement(placementId, patch) {
    updatePlacements(activeSpace.placements.map((placement) => (
      placement.id === placementId
        ? { ...placement, ...patch, updatedAt: new Date().toISOString() }
        : placement
    )));
  }

  function changeSpaceDisplayMode(nextMode) {
    saveSpace({ ...activeSpace, defaultDisplayMode: nextMode });
  }

  function startDrag(event, placement) {
    if (!isEditingLayout) return;
    event.preventDefault();
    setSelectedPlacementId(placement.id);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const startX = event.clientX;
    const startY = event.clientY;
    const startPlacement = { ...placement };
    event.currentTarget.setPointerCapture(event.pointerId);

    function move(pointerEvent) {
      const nextX = startPlacement.x + ((pointerEvent.clientX - startX) / rect.width) * 100;
      const nextY = startPlacement.y + ((pointerEvent.clientY - startY) / rect.height) * 100;
      updatePlacement(placement.id, {
        x: clamp(nextX, 0, 100 - startPlacement.width),
        y: clamp(nextY, 0, 100 - startPlacement.height),
      });
    }

    function stop() {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
    }

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop, { once: true });
  }

  function addSelectedPlants() {
    const now = new Date().toISOString();
    const nextPlacements = [...(activeSpace.placements || [])];
    selectedPlantIds.forEach((plantId) => {
      if (nextPlacements.some((placement) => placement.plantId === plantId)) return;
      nextPlacements.push({
        id: `placement-${plantId}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        plantId,
        ...firstOpenPlacement(nextPlacements.length),
        zIndex: nextPlacements.length + 1,
        displayMode: 'auto',
        shelf: '',
        createdAt: now,
        updatedAt: now,
      });
    });
    updatePlacements(nextPlacements);

    const shouldSync = selectedPlantIds.some((plantId) => {
      const plant = plantById.get(plantId);
      return plant && !plantMatchesLocation(plant, activeSpace.locationValue);
    }) && window.confirm(`Update selected plants' Location to ${activeSpace.locationValue}?`);

    if (shouldSync) {
      onPlantsChange(plants.map((plant) => (
        selectedPlantIds.includes(plant.id) ? { ...plant, location: activeSpace.locationValue } : plant
      )));
    }

    setSelectedPlantIds([]);
    setIsAddingPlants(false);
  }

  function removePlacement(placement) {
    const plant = plantById.get(placement.plantId);
    const confirmLocation = plantMatchesLocation(plant || {}, activeSpace.locationValue)
      && window.confirm(`Remove ${plant.name} from the visual wall. Do you also want to clear its Location field?`);

    updatePlacements(activeSpace.placements.filter((item) => item.id !== placement.id));
    setSelectedPlacementId('');

    if (confirmLocation) {
      onPlantsChange(plants.map((currentPlant) => (
        currentPlant.id === plant.id ? { ...currentPlant, location: '' } : currentPlant
      )));
    }
  }

  function bringForward(placement) {
    const topZ = Math.max(0, ...activeSpace.placements.map((item) => Number(item.zIndex) || 0));
    updatePlacement(placement.id, { zIndex: topZ + 1 });
  }

  function nudgeSelected(dx, dy) {
    if (!selectedPlacement) return;
    updatePlacement(selectedPlacement.id, {
      x: clamp(selectedPlacement.x + dx, 0, 100 - selectedPlacement.width),
      y: clamp(selectedPlacement.y + dy, 0, 100 - selectedPlacement.height),
    });
  }

  function highlightPlant(plantId) {
    setHighlightPlantId(plantId);
    tileRefs.current[plantId]?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
    window.setTimeout(() => setHighlightPlantId(''), 2200);
  }

  function toggleEditLayout() {
    setIsEditingLayout((editing) => !editing);
    if (!isEditingLayout) {
      window.setTimeout(() => {
        canvasWrapRef.current?.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
      }, 40);
    }
  }

  function openTile(plant, mode) {
    if (mode === 'compact-label' && canvasViewMode === 'fit' && !isEditingLayout) {
      setPreviewPlantId(plant.id);
      return;
    }
    onOpenPlant(plant);
  }

  const searchResults = placedPlants.filter((plant) => (
    plant.name.toLowerCase().includes(spaceSearch.trim().toLowerCase())
  ));

  const chooserPlants = plants
    .filter((plant) => !placedPlantIds.has(plant.id))
    .filter((plant) => {
      const query = chooserSearch.trim().toLowerCase();
      if (query && !plant.name.toLowerCase().includes(query)) return false;
      if (chooserFilters.genus && plant.genus !== chooserFilters.genus) return false;
      if (chooserFilters.medium && plant.medium !== chooserFilters.medium) return false;
      if (chooserFilters.status && plant.status !== chooserFilters.status) return false;
      if (chooserFilters.attention && plant.attention !== chooserFilters.attention) return false;
      return true;
    })
    .sort((first, second) => {
      const firstMatch = plantMatchesLocation(first, activeSpace.locationValue) ? 0 : 1;
      const secondMatch = plantMatchesLocation(second, activeSpace.locationValue) ? 0 : 1;
      return firstMatch - secondMatch || first.name.localeCompare(second.name);
    });

  if (!activeSpace) return null;

  return (
    <section className="plant-spaces-view" aria-labelledby="plant-spaces-heading">
      <div className="section-heading plant-spaces-heading">
        <div>
          <p className="detail-eyebrow">Real-world layouts</p>
          <h2 id="plant-spaces-heading" className="section-title">Plant Spaces</h2>
          <p>Organize plants by the places they actually live.</p>
        </div>
      </div>

      <div className="space-card-grid">
        {[...spaces, ...plannedSpaces].map((space) => {
          const plantCount = space.comingSoon
            ? plants.filter((plant) => plantMatchesLocation(plant, space.locationValue)).length
            : space.placements.length;
          return (
            <button className={`space-card${space.id === activeSpace.id ? ' space-card-active' : ''}`} type="button"
              key={space.id} disabled={space.comingSoon}
              onClick={() => {
                setSelectedSpaceId(space.id);
                setSelectedPlacementId('');
                setIsEditingLayout(false);
              }}>
              {space.backgroundImageUrl
                ? <SafeImage src={space.backgroundImageUrl} alt="" className="space-card-image" />
                : <span className="space-card-image space-card-fallback" aria-hidden="true">▦</span>}
              <span><strong>{space.name}</strong><small>{space.description}</small></span>
              <em>{plantCount} plant{plantCount === 1 ? '' : 's'}{space.comingSoon ? ' found by Location' : ''}</em>
            </button>
          );
        })}
      </div>

      <div className="plant-wall-shell">
        <div className="plant-wall-toolbar">
          <div>
            <p className="detail-eyebrow">{activeSpace.locationValue}</p>
            <h3>{activeSpace.name}</h3>
          </div>
          <div className="plant-wall-actions">
            {isEditingLayout ? (
              <button type="button" onClick={toggleEditLayout}>Done</button>
            ) : (
              <button type="button" onClick={toggleEditLayout}>Edit Layout</button>
            )}
            <button type="button" onClick={() => setIsAddingPlants((visible) => !visible)}>Add Plants</button>
            <button type="button" className="secondary-button" onClick={() => {
              setHighlightPlantId('');
              setSpaceSearch('');
              canvasWrapRef.current?.scrollTo({ left: 0, top: 0, behavior: 'smooth' });
              canvasRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }}>
              Reset View
            </button>
          </div>
        </div>

        <div className="plant-wall-tools">
          <label>
            <span>Search Plant Wall</span>
            <input type="search" value={spaceSearch} placeholder="Plant name"
              onChange={(event) => setSpaceSearch(event.target.value)} />
          </label>
          {spaceSearch && (
            <div className="space-search-results">
              {searchResults.length ? searchResults.map((plant) => (
                <button type="button" key={plant.id} onClick={() => highlightPlant(plant.id)}>{plant.name}</button>
              )) : <span>No placed plants match.</span>}
            </div>
          )}
          <label>
            <span>Background dim</span>
            <input type="range" min="0" max="80" value={activeSpace.backgroundDim || 0}
              onChange={(event) => saveSpace({ ...activeSpace, backgroundDim: Number(event.target.value) })} />
          </label>
          <div className="canvas-view-mode" aria-label="Plant Wall canvas view mode">
            <span>Canvas view</span>
            <div>
              <button type="button" className={canvasViewMode === 'fit' ? 'active' : ''}
                disabled={isEditingLayout} onClick={() => changeCanvasViewMode('fit')}>
                Fit Wall
              </button>
              <button type="button" className={canvasViewMode === 'pan' ? 'active' : ''}
                onClick={() => changeCanvasViewMode('pan')}>
                Actual Size / Pan
              </button>
            </div>
          </div>
          <label>
            <span>Default tile display</span>
            <select value={activeSpace.defaultDisplayMode || 'auto'}
              onChange={(event) => changeSpaceDisplayMode(event.target.value)}>
              {plantSpaceDisplayModes.map((mode) => (
                <option key={mode} value={mode}>{displayModeLabels[mode]}</option>
              ))}
            </select>
          </label>
        </div>
        {isEditingLayout && phoneLike && (
          <p className="plant-wall-mode-note" role="status">
            Edit Layout uses Actual Size / Pan for accurate placement. Done returns to your selected view.
          </p>
        )}

        {isAddingPlants && (
          <div className="add-plants-panel">
            <div className="add-plants-heading">
              <div>
                <h4>Add plants to {activeSpace.name}</h4>
                <p>Plants with Location set to {activeSpace.locationValue} appear first.</p>
              </div>
              <button type="button" className="secondary-button" onClick={() => setIsAddingPlants(false)}>Close</button>
            </div>
            <div className="add-plants-filters">
              <label>Search<input type="search" value={chooserSearch} onChange={(event) => setChooserSearch(event.target.value)} /></label>
              {[
                ['genus', 'Genus'],
                ['medium', 'Growing medium'],
                ['status', 'Status'],
                ['attention', 'Needs attention'],
              ].map(([fieldName, label]) => (
                <label key={fieldName}>{label}
                  <select value={chooserFilters[fieldName]} onChange={(event) => setChooserFilters({ ...chooserFilters, [fieldName]: event.target.value })}>
                    <option value="">All</option>
                    {(dropdownOptions[fieldName] || []).map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </label>
              ))}
            </div>
            <div className="add-plants-list">
              {chooserPlants.map((plant) => (
                <label className="add-plant-row" key={plant.id}>
                  <input type="checkbox" checked={selectedPlantIds.includes(plant.id)}
                    onChange={(event) => setSelectedPlantIds(event.target.checked
                      ? [...selectedPlantIds, plant.id]
                      : selectedPlantIds.filter((plantId) => plantId !== plant.id))} />
                  <PlantThumb plant={plant} />
                  <span><strong>{plant.name}</strong><small>{[plant.genus, plant.medium, plant.status].filter(Boolean).join(' · ') || 'Details not set'}</small></span>
                  {plantMatchesLocation(plant, activeSpace.locationValue) && <em>Location match</em>}
                </label>
              ))}
              {!chooserPlants.length && <p className="empty-message">No available plants match these filters.</p>}
            </div>
            <button type="button" disabled={!selectedPlantIds.length} onClick={addSelectedPlants}>
              Add {selectedPlantIds.length || ''} Plant{selectedPlantIds.length === 1 ? '' : 's'}
            </button>
          </div>
        )}

        <div className={`space-background-shell${isBackgroundEditorExpanded ? ' space-background-shell-open' : ''}`}>
          <button type="button" className="secondary-button change-background-toggle"
            aria-expanded={isBackgroundEditorExpanded}
            onClick={() => setIsBackgroundEditorExpanded((expanded) => !expanded)}>
            {isBackgroundEditorExpanded ? 'Hide Background Editor' : 'Change Background'}
          </button>
          {isBackgroundEditorExpanded && (
            <SpaceBackgroundEditor space={activeSpace} onSave={(patch) => {
              saveSpace({ ...activeSpace, ...patch });
              if (patch.backgroundImageUrl) setIsBackgroundEditorExpanded(false);
            }} />
          )}
        </div>

        {!activeSpace.placements.length && (
          <div className="plant-wall-empty">
            <strong>Build your Plant Wall in three steps.</strong>
            <span>Upload a wall photo, add plants whose Location is Plant Wall, then switch to Edit Layout and arrange the tiles.</span>
          </div>
        )}

        <div className={`plant-wall-canvas-wrap plant-wall-${canvasViewMode}${isEditingLayout ? ' plant-wall-editing' : ''}`}
          ref={canvasWrapRef}>
          <div className="plant-wall-canvas" ref={canvasRef} style={{
            aspectRatio: `${activeSpace.width} / ${activeSpace.height}`,
            backgroundImage: activeSpace.backgroundImageUrl ? `linear-gradient(rgba(0,0,0,${(activeSpace.backgroundDim || 0) / 100}), rgba(0,0,0,${(activeSpace.backgroundDim || 0) / 100})), url(${activeSpace.backgroundImageUrl})` : undefined,
          }}>
            {activeSpace.placements.map((placement) => {
              const plant = plantById.get(placement.plantId);
              if (!plant) return null;
              const size = tileSize(placement);
              const displayMode = resolvePlacementDisplayMode(placement, activeSpace, { canvasViewMode, isEditingLayout, phoneLike });
              const statuses = getTileStatuses(plant, reminders);
              const visibleStatuses = displayMode === 'full-card' ? statuses.slice(0, 3) : statuses.slice(0, 1);
              const selected = selectedPlacementId === placement.id;
              return (
                <button
                  className={`plant-space-tile plant-space-tile-${displayMode}${selected ? ' plant-space-tile-selected' : ''}${highlightPlantId === plant.id ? ' plant-space-tile-highlight' : ''}`}
                  key={placement.id}
                  type="button"
                  ref={(node) => { tileRefs.current[plant.id] = node; }}
                  style={{
                    left: `${placement.x}%`,
                    top: `${placement.y}%`,
                    width: `${size.width}%`,
                    height: `${size.height}%`,
                    zIndex: placement.zIndex,
                  }}
                  onPointerDown={(event) => startDrag(event, placement)}
                  onClick={() => (isEditingLayout ? setSelectedPlacementId(placement.id) : openTile(plant, displayMode))}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !isEditingLayout) openTile(plant, displayMode);
                  }}
                  aria-label={`${isEditingLayout ? 'Select placement for' : displayMode === 'compact-label' ? 'Preview' : 'Open'} ${plant.name}`}
                >
                  {displayMode !== 'compact-label' && <PlantThumb plant={plant} />}
                  <span className="plant-space-tile-name">{plant.name}</span>
                  {displayMode === 'full-card' && plant.genus && <span className="plant-space-tile-genus">{plant.genus}</span>}
                  {visibleStatuses.length > 0 && (
                    <span className="plant-space-indicators">
                      {visibleStatuses.map((status) => (
                        <em className={`plant-space-status-${status.kind}`} key={status.label} title={status.label}
                          aria-label={status.label}>
                          {status.code}
                        </em>
                      ))}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {isEditingLayout && selectedPlacement && (
          <div className="placement-editor" aria-label="Selected tile controls">
            <strong>{plantById.get(selectedPlacement.plantId)?.name || 'Selected plant'}</strong>
            <label>Tile display
              <select value={selectedPlacement.displayMode || 'auto'}
                onChange={(event) => updatePlacement(selectedPlacement.id, { displayMode: event.target.value })}>
                {plantSpaceDisplayModes.map((mode) => (
                  <option key={mode} value={mode}>{displayModeLabels[mode]}</option>
                ))}
              </select>
            </label>
            <div className="placement-nudge-grid">
              <button type="button" aria-label="Move up" onClick={() => nudgeSelected(0, -1)}>↑</button>
              <button type="button" aria-label="Move left" onClick={() => nudgeSelected(-1, 0)}>←</button>
              <button type="button" aria-label="Move right" onClick={() => nudgeSelected(1, 0)}>→</button>
              <button type="button" aria-label="Move down" onClick={() => nudgeSelected(0, 1)}>↓</button>
            </div>
            <label>Tile size
              <input type="range" min="8" max="34" value={selectedPlacement.width}
                onChange={(event) => updatePlacement(selectedPlacement.id, {
                  width: Number(event.target.value),
                  height: Math.max(10, Number(event.target.value) * 1.1),
                })} />
            </label>
            <button type="button" onClick={() => bringForward(selectedPlacement)}>Bring Forward</button>
            <button type="button" className="secondary-button" onClick={() => removePlacement(selectedPlacement)}>
              Remove From Space
            </button>
          </div>
        )}

        {previewPlant && (
          <div className="compact-tile-preview-backdrop">
            <aside className="compact-tile-preview" ref={compactPreviewRef}
              aria-label={`${previewPlant.name} preview`} role="dialog">
              <button type="button" className="compact-preview-close" aria-label="Close preview"
                onClick={() => setPreviewPlantId('')}>
                ×
              </button>
              <PlantThumb plant={previewPlant} />
              <div>
                <p className="detail-eyebrow">Plant Space preview</p>
                <h4>{previewPlant.name}</h4>
                {previewPlant.genus && <p>{previewPlant.genus}</p>}
                {previewStatuses[0] && (
                  <span className={`compact-preview-status plant-space-status-${previewStatuses[0].kind}`}>
                    {previewStatuses[0].label}
                  </span>
                )}
              </div>
              <button type="button" onClick={() => {
                setPreviewPlantId('');
                onOpenPlant(previewPlant);
              }}>
                Open Plant Details
              </button>
            </aside>
          </div>
        )}
      </div>
    </section>
  );
}

function PlantThumb({ plant }) {
  return (
    <span className="plant-space-thumb">
      {plant.imageUrl
        ? <SafeImage src={plant.imageUrl} alt="" fallback={<span>{plant.image || '🌿'}</span>} />
        : <span>{plant.image || '🌿'}</span>}
    </span>
  );
}
