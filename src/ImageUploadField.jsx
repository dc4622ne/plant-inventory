import { useState } from 'react';

const MAX_IMAGE_DIMENSION = 1600;
const RESIZE_THRESHOLD = 1_500_000;

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('That image could not be read.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('That image format could not be opened.'));
    image.src = dataUrl;
  });
}

async function prepareImage(file) {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
  const dataUrl = await readFileAsDataUrl(file);
  if (file.size <= RESIZE_THRESHOLD) return dataUrl;

  try {
    const image = await loadImage(dataUrl);
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.82);
  } catch {
    return dataUrl;
  }
}

export function SafeImage({ src, alt, className, fallback = null }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return fallback;
  return <img className={className} src={src} alt={alt} onError={() => setFailed(true)} />;
}

export default function ImageUploadField({ id, value = '', onChange, label = 'Image URL (optional)', className = '', required = false }) {
  const [message, setMessage] = useState('');
  const uploaded = value.startsWith('data:image/');

  async function chooseImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setMessage('Preparing image…');
    try {
      onChange(await prepareImage(file));
      setMessage('Photo selected and ready to save.');
    } catch (error) {
      setMessage(error.message || 'That image could not be added.');
    } finally {
      event.target.value = '';
    }
  }

  return (
    <div className={`form-field image-upload-field ${className}`.trim()}>
      <label htmlFor={`${id}-url`}>{label}</label>
      <input id={`${id}-url`} type="url" value={uploaded ? '' : value}
        placeholder={uploaded ? 'Uploaded photo selected' : 'https://example.com/photo.jpg'}
        required={required && !uploaded}
        onChange={(event) => { onChange(event.target.value); setMessage(''); }} />
      <span className="image-choice-label">or choose a photo from your device</span>
      <input id={`${id}-file`} className="image-file-input" type="file" accept="image/*"
        onChange={chooseImage} aria-describedby={`${id}-help`} />
      <small id={`${id}-help`}>Smaller images use less browser storage. Large photos are reduced automatically.</small>
      {message && <small className="image-upload-message" role="status">{message}</small>}
      {value && <div className="image-upload-preview">
        <SafeImage key={value} src={value} alt="Selected preview" />
        <button className="secondary-button" type="button" onClick={() => { onChange(''); setMessage('Image removed.'); }}>Remove image</button>
      </div>}
    </div>
  );
}
