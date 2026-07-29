export const quickNotesStorageKey = 'plant-inventory-quick-notes';

export function normalizeQuickNote(note) {
  if (!note || typeof note !== 'object') return null;
  return {
    id: String(note.id || ''),
    text: String(note.text || ''),
    createdAt: String(note.createdAt || new Date().toISOString()),
    observedAt: String(note.observedAt || note.createdAt || new Date().toISOString()),
    plantId: String(note.plantId || ''),
    photoUrl: String(note.photoUrl || ''),
    status: note.status === 'filed' ? 'filed' : 'unprocessed',
    filedAt: String(note.filedAt || ''),
    filedAs: String(note.filedAs || ''),
    destinationId: String(note.destinationId || ''),
    editedAt: String(note.editedAt || ''),
  };
}

export function updateQuickNote(notes, noteId, changes, editedAt = new Date().toISOString()) {
  return notes.map((note) => {
    if (note.id !== noteId) return note;
    const changed = ['text', 'plantId', 'photoUrl'].some(
      (field) => Object.hasOwn(changes, field) && changes[field] !== note[field],
    );
    return changed ? { ...note, ...changes, editedAt } : note;
  });
}

export function loadQuickNotes() {
  try {
    const parsed = JSON.parse(localStorage.getItem(quickNotesStorageKey) || '[]');
    return Array.isArray(parsed) ? parsed.map(normalizeQuickNote).filter(Boolean) : [];
  } catch {
    return [];
  }
}
