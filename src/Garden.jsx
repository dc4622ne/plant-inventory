import { useEffect, useState } from 'react';
import { gardenStorageKey } from './gardenData';
import ImageUploadField, { SafeImage } from './ImageUploadField';
import { uploadStoredImage } from './imageUploadUtils';

const cropStatuses = ['Not set', 'Planned', 'Planted', 'Growing', 'Flowering', 'Fruiting', 'Ready to harvest', 'Harvested', 'Failed / removed'];
const sunOptions = ['Not set', 'Full sun', 'Partial sun', 'Partial shade', 'Full shade'];
const activityTypes = ['Watered', 'Fertilized', 'Pest treatment', 'Planted', 'Harvested', 'Pruned', 'Trellised', 'Weeded', 'Weather note', 'General note'];
const locationSuggestions = ['Backyard', 'Front yard', 'Front porch', 'Patio', 'Balcony', 'Greenhouse'];
const cropTypeSuggestions = ['Vegetable', 'Herb', 'Fruit', 'Flower', 'Root crop', 'Leafy green'];

const todayDate = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const makeId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const emptyBed = { name: '', location: '', size: '', sunExposure: '', notes: '', imageUrl: '', crops: [], activities: [], harvests: [] };
const emptyCrop = { name: '', type: '', variety: '', imageUrl: '', plantingDate: '', expectedHarvestDate: '', actualHarvestDate: '', daysToMaturity: '', status: 'Not set', companionNotes: '', pestNotes: '', fertilizingNotes: '', notes: '' };
const emptyActivity = () => ({ activityType: 'Watered', date: todayDate(), notes: '' });
const emptyHarvest = () => ({ cropName: '', date: todayDate(), amount: '', notes: '' });

function daysSince(date) {
  if (!date) return null;
  const planted = new Date(`${date}T00:00:00`);
  if (Number.isNaN(planted.getTime())) return null;
  return Math.max(0, Math.floor((new Date() - planted) / 86400000));
}
const newestFirst = (entries) => [...entries].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

function FormField({ id, label, className = '', children }) {
  return <div className={`form-field ${className}`.trim()}><label htmlFor={id}>{label}</label>{children}</div>;
}

function CropImage({ crop }) {
  const [failed, setFailed] = useState(false);
  if (!crop.imageUrl?.trim() || failed) return null;
  return <img className="garden-crop-image" src={crop.imageUrl} alt={`${crop.name} crop`} onError={() => setFailed(true)} />;
}

export default function Garden({ beds, onChange, initialFilter, onDirtyChange }) {
  const [selectedId, setSelectedId] = useState('');
  const [showBedForm, setShowBedForm] = useState(false);
  const [bedDraft, setBedDraft] = useState(emptyBed);
  const [editingBedId, setEditingBedId] = useState('');
  const [cropDraft, setCropDraft] = useState(emptyCrop);
  const [editingCropId, setEditingCropId] = useState('');
  const [cropImageFile, setCropImageFile] = useState(null);
  const [cropImagePreviewUrl, setCropImagePreviewUrl] = useState('');
  const [cropImageUploadError, setCropImageUploadError] = useState('');
  const [cropSubmitStatus, setCropSubmitStatus] = useState('');
  const [isCropSubmitting, setIsCropSubmitting] = useState(false);
  const [bedImageFile, setBedImageFile] = useState(null);
  const [bedImagePreviewUrl, setBedImagePreviewUrl] = useState('');
  const [bedImageUploadError, setBedImageUploadError] = useState('');
  const [bedSubmitStatus, setBedSubmitStatus] = useState('');
  const [isBedSubmitting, setIsBedSubmitting] = useState(false);
  const [activityDraft, setActivityDraft] = useState(emptyActivity);
  const [editingActivityId, setEditingActivityId] = useState('');
  const [harvestDraft, setHarvestDraft] = useState(emptyHarvest);
  const [editingHarvestId, setEditingHarvestId] = useState('');
  const [search, setSearch] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialFilter?.status || '');

  const save = (next) => { localStorage.setItem(gardenStorageKey, JSON.stringify(next)); onChange(next); };
  const selectedBed = beds.find((bed) => bed.id === selectedId);
  const updateSelected = (updates) => save(beds.map((bed) => bed.id === selectedId ? { ...bed, ...updates } : bed));
  const locations = [...new Set(beds.map((bed) => bed.location).filter(Boolean))].sort();
  const query = search.trim().toLowerCase();
  const visibleBeds = beds.filter((bed) => {
    const crops = bed.crops || [];
    const matchesText = !query || [bed.name, bed.location, ...crops.flatMap((crop) => [crop.name, crop.type])].some((value) => String(value || '').toLowerCase().includes(query));
    const matchesLocation = !locationFilter || bed.location === locationFilter;
    const matchesStatus = !statusFilter || crops.some((crop) => crop.status === statusFilter);
    const matchesPests = !initialFilter?.pests || crops.some((crop) => crop.pestNotes?.trim());
    const matchesActive = !initialFilter?.active || crops.some((crop) => !['Not set', 'Planned', 'Harvested', 'Failed / removed'].includes(crop.status));
    const recentCutoff = new Date();
    recentCutoff.setDate(recentCutoff.getDate() - 30);
    const matchesRecentHarvests = !initialFilter?.recentHarvests || (bed.harvests || []).some((entry) => entry.date >= recentCutoff.toISOString().slice(0, 10));
    return matchesText && matchesLocation && matchesStatus && matchesPests && matchesActive && matchesRecentHarvests;
  });
  const bedBaseline = editingBedId ? beds.find((bed) => bed.id === editingBedId) : emptyBed;
  const cropBaseline = editingCropId ? selectedBed?.crops.find((crop) => crop.id === editingCropId) : emptyCrop;
  const activityBaseline = editingActivityId ? selectedBed?.activities.find((entry) => entry.id === editingActivityId) : emptyActivity();
  const harvestBaseline = editingHarvestId ? selectedBed?.harvests.find((entry) => entry.id === editingHarvestId) : emptyHarvest();
  const bedDirty = showBedForm && (JSON.stringify(bedDraft) !== JSON.stringify(bedBaseline) || Boolean(bedImageFile));
  const cropDirty = Boolean(selectedBed) && (JSON.stringify(cropDraft) !== JSON.stringify(cropBaseline) || Boolean(cropImageFile));
  const activityDirty = Boolean(selectedBed) && JSON.stringify(activityDraft) !== JSON.stringify(activityBaseline);
  const harvestDirty = Boolean(selectedBed) && JSON.stringify(harvestDraft) !== JSON.stringify(harvestBaseline);
  const hasUnsavedChanges = bedDirty || cropDirty || activityDirty || harvestDirty;

  useEffect(() => {
    onDirtyChange?.(hasUnsavedChanges);
    return () => onDirtyChange?.(false);
  }, [hasUnsavedChanges, onDirtyChange]);

  useEffect(() => () => {
    if (bedImagePreviewUrl) URL.revokeObjectURL(bedImagePreviewUrl);
  }, [bedImagePreviewUrl]);

  useEffect(() => () => {
    if (cropImagePreviewUrl) URL.revokeObjectURL(cropImagePreviewUrl);
  }, [cropImagePreviewUrl]);

  function confirmDiscard(isDirty = hasUnsavedChanges) {
    return !isDirty || window.confirm('You have unsaved changes. Discard them and continue?');
  }

  function clearBedImageSelection() {
    if (bedImagePreviewUrl) URL.revokeObjectURL(bedImagePreviewUrl);
    setBedImageFile(null);
    setBedImagePreviewUrl('');
    setBedImageUploadError('');
    setBedSubmitStatus('');
  }

  function selectBedImageFile(file) {
    if (!file) {
      clearBedImageSelection();
      return;
    }

    if (bedImagePreviewUrl) URL.revokeObjectURL(bedImagePreviewUrl);
    setBedImageFile(file);
    setBedImagePreviewUrl(URL.createObjectURL(file));
    setBedImageUploadError('');
    setBedSubmitStatus('');
  }

  function clearCropImageSelection() {
    if (cropImagePreviewUrl) URL.revokeObjectURL(cropImagePreviewUrl);
    setCropImageFile(null);
    setCropImagePreviewUrl('');
    setCropImageUploadError('');
    setCropSubmitStatus('');
  }

  function selectCropImageFile(file) {
    if (!file) {
      clearCropImageSelection();
      return;
    }

    if (cropImagePreviewUrl) URL.revokeObjectURL(cropImagePreviewUrl);
    setCropImageFile(file);
    setCropImagePreviewUrl(URL.createObjectURL(file));
    setCropImageUploadError('');
    setCropSubmitStatus('');
  }

  async function submitBed(event) {
    event.preventDefault();
    if (isBedSubmitting) return;

    setBedImageUploadError('');
    setIsBedSubmitting(true);
    setBedSubmitStatus(bedImageFile ? 'Uploading bed photo...' : 'Saving garden bed...');

    try {
      const uploadedImageUrl = bedImageFile ? await uploadStoredImage(bedImageFile, 'garden-beds') : bedDraft.imageUrl;
      setBedSubmitStatus('Saving garden bed...');
      const nextBed = { ...bedDraft, imageUrl: uploadedImageUrl, id: editingBedId || makeId(), name: bedDraft.name.trim() };
      save(editingBedId ? beds.map((bed) => bed.id === editingBedId ? nextBed : bed) : [...beds, nextBed]);
      setBedDraft(emptyBed); setEditingBedId(''); setShowBedForm(false); clearBedImageSelection();
    } catch (error) {
      console.error('Garden bed image upload failed:', error);
      setBedImageUploadError(error.message || String(error));
      setBedSubmitStatus('');
    } finally {
      setIsBedSubmitting(false);
    }
  }
  function editBed(bed) { if (!confirmDiscard()) return; clearBedImageSelection(); setBedDraft({ ...emptyBed, ...bed }); setEditingBedId(bed.id); setShowBedForm(true); setSelectedId(''); }
  function deleteBed(bed) { if (window.confirm(`Delete ${bed.name} and all of its crops and logs?`)) { save(beds.filter((item) => item.id !== bed.id)); setSelectedId(''); } }
  async function submitCrop(event) {
    event.preventDefault();
    if (isCropSubmitting) return;

    setCropImageUploadError('');
    setIsCropSubmitting(true);
    setCropSubmitStatus(cropImageFile ? 'Uploading crop photo...' : 'Saving crop...');

    try {
      const uploadedImageUrl = cropImageFile ? await uploadStoredImage(cropImageFile, 'garden-crops') : cropDraft.imageUrl;
      setCropSubmitStatus('Saving crop...');
      const item = { ...cropDraft, imageUrl: uploadedImageUrl, id: editingCropId || makeId(), name: cropDraft.name.trim() };
      updateSelected({ crops: editingCropId ? selectedBed.crops.map((crop) => crop.id === editingCropId ? item : crop) : [...selectedBed.crops, item] });
      setCropDraft(emptyCrop); setEditingCropId(''); clearCropImageSelection();
    } catch (error) {
      console.error('Garden crop image upload failed:', error);
      setCropImageUploadError(error.message || String(error));
      setCropSubmitStatus('');
    } finally {
      setIsCropSubmitting(false);
    }
  }
  function deleteCrop(crop) { if (window.confirm(`Delete ${crop.name}?`)) updateSelected({ crops: selectedBed.crops.filter((item) => item.id !== crop.id) }); }
  function submitActivity(event) {
    event.preventDefault(); const item = { ...activityDraft, id: editingActivityId || makeId() };
    updateSelected({ activities: editingActivityId ? selectedBed.activities.map((entry) => entry.id === editingActivityId ? item : entry) : [...selectedBed.activities, item] });
    setActivityDraft(emptyActivity()); setEditingActivityId('');
  }
  function deleteActivity(entry) { if (window.confirm('Delete this garden activity?')) updateSelected({ activities: selectedBed.activities.filter((item) => item.id !== entry.id) }); }
  function submitHarvest(event) {
    event.preventDefault(); const item = { ...harvestDraft, id: editingHarvestId || makeId(), cropName: harvestDraft.cropName.trim() };
    updateSelected({ harvests: editingHarvestId ? selectedBed.harvests.map((entry) => entry.id === editingHarvestId ? item : entry) : [...selectedBed.harvests, item] });
    setHarvestDraft(emptyHarvest()); setEditingHarvestId('');
  }
  function deleteHarvest(entry) { if (window.confirm('Delete this harvest entry?')) updateSelected({ harvests: selectedBed.harvests.filter((item) => item.id !== entry.id) }); }

  if (selectedBed) return <section className="garden-view garden-detail">
    <button className="back-button" type="button" onClick={() => { if (confirmDiscard()) setSelectedId(''); }}>← Back to Garden Beds</button>
    <div className="garden-detail-hero">
      {selectedBed.imageUrl && <SafeImage key={selectedBed.imageUrl} src={selectedBed.imageUrl} alt={`${selectedBed.name} garden bed`} />}
      <div><p className="detail-eyebrow">Garden bed</p><h2>{selectedBed.name}</h2><p>{[selectedBed.location, selectedBed.size, selectedBed.sunExposure].filter(Boolean).join(' · ') || 'Bed details not set'}</p><p>{selectedBed.notes}</p></div>
      <div className="garden-card-actions"><button className="edit-plant-button" type="button" onClick={() => editBed(selectedBed)} aria-label="Edit garden bed" title="Edit garden bed">✏️</button><button className="delete-plant-button" type="button" onClick={() => deleteBed(selectedBed)} aria-label="Delete garden bed" title="Delete garden bed">🗑️</button></div>
    </div>
    <section className="garden-panel"><h3>Crops planted</h3>
      <form className="plant-form garden-inline-form" onSubmit={submitCrop}>
        {cropImageUploadError && <p className="form-error-message wide-field" role="alert">{cropImageUploadError}</p>}
        {cropSubmitStatus && <p className="form-status-message wide-field" role="status">{cropSubmitStatus}</p>}
        <FormField id="garden-crop-name" label="Crop name *"><input id="garden-crop-name" required value={cropDraft.name} onChange={(e) => setCropDraft({ ...cropDraft, name: e.target.value })} /></FormField>
        <FormField id="garden-crop-type" label="Crop type / category"><input id="garden-crop-type" list="crop-types" value={cropDraft.type} onChange={(e) => setCropDraft({ ...cropDraft, type: e.target.value })} /></FormField>
        <datalist id="crop-types">{cropTypeSuggestions.map((item) => <option key={item}>{item}</option>)}</datalist>
        <FormField id="garden-crop-variety" label="Variety"><input id="garden-crop-variety" value={cropDraft.variety} onChange={(e) => setCropDraft({ ...cropDraft, variety: e.target.value })} /></FormField>
        <ImageUploadField id="garden-crop-image" label="Image URL" value={cropDraft.imageUrl}
          onChange={(imageUrl) => { clearCropImageSelection(); setCropDraft({ ...cropDraft, imageUrl }); }}
          onFileSelected={selectCropImageFile}
          selectedFileName={cropImageFile?.name || ''}
          previewUrl={cropImagePreviewUrl}
          disabled={isCropSubmitting}
          message={cropImageUploadError}
          messageType={cropImageUploadError ? 'error' : 'status'} />
        <FormField id="garden-planting-date" label="Planting date"><input id="garden-planting-date" type="date" value={cropDraft.plantingDate} onChange={(e) => setCropDraft({ ...cropDraft, plantingDate: e.target.value })} /></FormField>
        <FormField id="garden-expected-harvest" label="Expected harvest"><input id="garden-expected-harvest" type="date" value={cropDraft.expectedHarvestDate} onChange={(e) => setCropDraft({ ...cropDraft, expectedHarvestDate: e.target.value })} /></FormField>
        <FormField id="garden-actual-harvest" label="Actual harvest"><input id="garden-actual-harvest" type="date" value={cropDraft.actualHarvestDate} onChange={(e) => setCropDraft({ ...cropDraft, actualHarvestDate: e.target.value })} /></FormField>
        <FormField id="garden-days-maturity" label="Days to maturity"><input id="garden-days-maturity" type="number" min="0" value={cropDraft.daysToMaturity} onChange={(e) => setCropDraft({ ...cropDraft, daysToMaturity: e.target.value })} /></FormField>
        <FormField id="garden-crop-status" label="Status"><select id="garden-crop-status" value={cropDraft.status} onChange={(e) => setCropDraft({ ...cropDraft, status: e.target.value })}>{cropStatuses.map((item) => <option key={item}>{item}</option>)}</select></FormField>
        {['companionNotes', 'pestNotes', 'fertilizingNotes', 'notes'].map((field) => { const id = `garden-${field}`; return <FormField id={id} className="wide-field" key={field} label={({ companionNotes: 'Companion notes', pestNotes: 'Pest notes', fertilizingNotes: 'Fertilizing notes', notes: 'General notes' })[field]}><textarea id={id} rows="2" value={cropDraft[field]} onChange={(e) => setCropDraft({ ...cropDraft, [field]: e.target.value })} /></FormField>; })}
        <div className="form-actions wide-field"><button type="submit" disabled={isCropSubmitting}>{isCropSubmitting ? (cropImageFile ? 'Uploading photo...' : 'Saving crop...') : (editingCropId ? 'Save crop' : 'Add crop')}</button>{editingCropId && <button className="secondary-button" type="button" disabled={isCropSubmitting} onClick={() => { if (confirmDiscard(cropDirty)) { setCropDraft(emptyCrop); setEditingCropId(''); clearCropImageSelection(); } }}>Cancel</button>}</div>
      </form>
      <div className="garden-entry-list">{selectedBed.crops.length ? selectedBed.crops.map((crop) => <article className="garden-entry garden-crop-entry" key={crop.id}><CropImage key={crop.imageUrl} crop={crop} /><div><h4>{crop.name}{crop.variety ? ` — ${crop.variety}` : ''}</h4><p>{crop.type || 'Type not set'} · {crop.status || 'Not set'}{daysSince(crop.plantingDate) !== null ? ` · ${daysSince(crop.plantingDate)} days since planting` : ''}</p>{crop.expectedHarvestDate && <p>Expected harvest: {crop.expectedHarvestDate}</p>}{crop.pestNotes && <p><strong>Pests:</strong> {crop.pestNotes}</p>}{crop.fertilizingNotes && <p><strong>Fertilizing:</strong> {crop.fertilizingNotes}</p>}{crop.companionNotes && <p><strong>Companions:</strong> {crop.companionNotes}</p>}{crop.notes && <p>{crop.notes}</p>}</div><div className="garden-card-actions"><button className="edit-plant-button" type="button" onClick={() => { if (confirmDiscard(cropDirty)) { clearCropImageSelection(); setCropDraft({ ...emptyCrop, ...crop }); setEditingCropId(crop.id); } }} aria-label={`Edit ${crop.name}`} title="Edit crop">✏️</button><button className="delete-plant-button" type="button" onClick={() => deleteCrop(crop)} aria-label={`Delete ${crop.name}`} title="Delete crop">🗑️</button></div></article>) : <p className="empty-message">No crops in this bed yet.</p>}</div>
    </section>
    <LogPanel title="Garden activity log" draft={activityDraft} setDraft={setActivityDraft} onSubmit={submitActivity} editing={editingActivityId} entries={newestFirst(selectedBed.activities)} fields="activity" onEdit={(entry) => { if (confirmDiscard(activityDirty)) { setActivityDraft(entry); setEditingActivityId(entry.id); } }} onDelete={deleteActivity} onCancel={() => { if (confirmDiscard(activityDirty)) { setActivityDraft(emptyActivity()); setEditingActivityId(''); } }} />
    <LogPanel title="Harvest log" draft={harvestDraft} setDraft={setHarvestDraft} onSubmit={submitHarvest} editing={editingHarvestId} entries={newestFirst(selectedBed.harvests)} fields="harvest" cropNames={selectedBed.crops.map((crop) => crop.name)} onEdit={(entry) => { if (confirmDiscard(harvestDirty)) { setHarvestDraft(entry); setEditingHarvestId(entry.id); } }} onDelete={deleteHarvest} onCancel={() => { if (confirmDiscard(harvestDirty)) { setHarvestDraft(emptyHarvest()); setEditingHarvestId(''); } }} />
  </section>;

  return <section className="garden-view" aria-labelledby="garden-heading">
    <div className="section-heading"><div><p className="detail-eyebrow">Outdoor growing</p><h2 id="garden-heading">Garden Beds</h2><p>Track beds, crops, care, pests, and harvests separately from your houseplants.</p></div><button className="add-plant-button" type="button" onClick={() => { if (confirmDiscard(bedDirty)) { clearBedImageSelection(); setBedDraft(emptyBed); setEditingBedId(''); setShowBedForm(true); } }} aria-label="Add garden bed">+</button></div>
    {showBedForm && <form className="plant-form garden-bed-form" onSubmit={submitBed}><h2>{editingBedId ? 'Edit garden bed' : 'Add garden bed'}</h2><div className="form-grid">
      {bedImageUploadError && <p className="form-error-message form-field-wide" role="alert">{bedImageUploadError}</p>}
      {bedSubmitStatus && <p className="form-status-message form-field-wide" role="status">{bedSubmitStatus}</p>}
      <FormField id="garden-bed-name" label="Bed name *"><input id="garden-bed-name" required value={bedDraft.name} onChange={(e) => setBedDraft({ ...bedDraft, name: e.target.value })} /></FormField>
      <FormField id="garden-bed-location" label="Bed location"><input id="garden-bed-location" list="bed-locations" value={bedDraft.location} onChange={(e) => setBedDraft({ ...bedDraft, location: e.target.value })} /></FormField><datalist id="bed-locations">{locationSuggestions.map((item) => <option key={item}>{item}</option>)}</datalist>
      <FormField id="garden-bed-size" label="Bed size"><input id="garden-bed-size" placeholder="e.g. 4x8 bed" value={bedDraft.size} onChange={(e) => setBedDraft({ ...bedDraft, size: e.target.value })} /></FormField>
      <FormField id="garden-bed-sun" label="Sun exposure"><select id="garden-bed-sun" value={bedDraft.sunExposure} onChange={(e) => setBedDraft({ ...bedDraft, sunExposure: e.target.value })}>{sunOptions.map((item) => <option key={item} value={item === 'Not set' ? '' : item}>{item}</option>)}</select></FormField>
      <ImageUploadField id="garden-bed-image" label="Image URL" className="form-field-wide" value={bedDraft.imageUrl}
        onChange={(imageUrl) => { clearBedImageSelection(); setBedDraft({ ...bedDraft, imageUrl }); }}
        onFileSelected={selectBedImageFile}
        selectedFileName={bedImageFile?.name || ''}
        previewUrl={bedImagePreviewUrl}
        disabled={isBedSubmitting}
        message={bedImageUploadError}
        messageType={bedImageUploadError ? 'error' : 'status'} />
      <FormField id="garden-bed-notes" label="Notes" className="form-field-wide"><textarea id="garden-bed-notes" rows="3" value={bedDraft.notes} onChange={(e) => setBedDraft({ ...bedDraft, notes: e.target.value })} /></FormField>
    </div><div className="form-actions"><button type="submit" disabled={isBedSubmitting}>{isBedSubmitting ? (bedImageFile ? 'Uploading photo...' : 'Saving garden bed...') : 'Save garden bed'}</button><button className="secondary-button" type="button" disabled={isBedSubmitting} onClick={() => { if (confirmDiscard(bedDirty)) { setShowBedForm(false); setEditingBedId(''); setBedDraft(emptyBed); clearBedImageSelection(); } }}>Cancel</button></div></form>}
    <div className="garden-tools"><label>Search<input type="search" placeholder="Bed, location, crop, or crop type" value={search} onChange={(e) => setSearch(e.target.value)} /></label><label>Bed location<select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)}><option value="">All locations</option>{locations.map((item) => <option key={item}>{item}</option>)}</select></label><label>Crop status<select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">All statuses</option>{cropStatuses.map((item) => <option key={item}>{item}</option>)}</select></label><button className="clear-filters-button" type="button" onClick={() => { setSearch(''); setLocationFilter(''); setStatusFilter(''); }}>Clear filters</button></div>
    <div className="garden-card-grid">{visibleBeds.length ? visibleBeds.map((bed) => <article className="garden-card" key={bed.id} onClick={() => setSelectedId(bed.id)} onKeyDown={(e) => { if (e.key === 'Enter') setSelectedId(bed.id); }} role="button" tabIndex="0"><div className="garden-card-image">{bed.imageUrl ? <SafeImage key={bed.imageUrl} src={bed.imageUrl} alt="" fallback={<span>🌿</span>} /> : <span>🌿</span>}</div><div><h3>{bed.name}</h3><p>{bed.location || 'Location not set'}</p><dl><div><dt>Size</dt><dd>{bed.size || 'Not set'}</dd></div><div><dt>Sun</dt><dd>{bed.sunExposure || 'Not set'}</dd></div><div><dt>Crops</dt><dd>{bed.crops.length}</dd></div></dl><span className="view-details">View garden bed →</span></div></article>) : <p className="empty-message">No garden beds match these filters.</p>}</div>
  </section>;
}

function LogPanel({ title, draft, setDraft, onSubmit, editing, entries, fields, cropNames = [], onEdit, onDelete, onCancel }) {
  const harvest = fields === 'harvest';
  const prefix = harvest ? 'harvest' : 'garden-activity';
  return <section className="garden-panel"><h3>{title}</h3><form className="plant-form activity-form garden-log-form" onSubmit={onSubmit}>
    {harvest ? <FormField id={`${prefix}-crop-name`} label="Crop name *"><input id={`${prefix}-crop-name`} list="harvest-crops" required value={draft.cropName} onChange={(e) => setDraft({ ...draft, cropName: e.target.value })} /><datalist id="harvest-crops">{cropNames.map((name) => <option key={name}>{name}</option>)}</datalist></FormField> : <FormField id={`${prefix}-type`} label="Activity type"><select id={`${prefix}-type`} value={draft.activityType} onChange={(e) => setDraft({ ...draft, activityType: e.target.value })}>{activityTypes.map((item) => <option key={item}>{item}</option>)}</select></FormField>}
    <FormField id={`${prefix}-date`} label="Date"><input id={`${prefix}-date`} type="date" required value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></FormField>
    {harvest && <FormField id={`${prefix}-amount`} label="Amount"><input id={`${prefix}-amount`} placeholder="e.g. 3 peppers" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} /></FormField>}
    <FormField id={`${prefix}-notes`} label="Notes (optional)" className="wide-field"><textarea id={`${prefix}-notes`} rows="3" value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></FormField><div className="form-actions wide-field"><button type="submit">{editing ? 'Save changes' : 'Add log entry'}</button>{editing && <button className="secondary-button" type="button" onClick={onCancel}>Cancel</button>}</div>
  </form><div className="garden-entry-list">{entries.length ? entries.map((entry) => <article className="garden-entry" key={entry.id}><div><h4>{harvest ? entry.cropName : entry.activityType}</h4><p>{entry.date}{harvest && entry.amount ? ` · ${entry.amount}` : ''}</p>{entry.notes && <p>{entry.notes}</p>}</div><div className="garden-card-actions"><button className="edit-plant-button" type="button" onClick={() => onEdit(entry)} aria-label={`Edit ${harvest ? 'harvest' : 'activity'} entry`} title="Edit">✏️</button><button className="delete-plant-button" type="button" onClick={() => onDelete(entry)} aria-label={`Delete ${harvest ? 'harvest' : 'activity'} entry`} title="Delete">🗑️</button></div></article>) : <p className="empty-message">No entries yet.</p>}</div></section>;
}
