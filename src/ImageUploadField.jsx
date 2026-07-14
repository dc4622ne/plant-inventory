import { useState } from 'react';
import { imageAcceptAttribute, prepareImageForStorage, readFileAsDataUrl, validateImageFile } from './imageUploadUtils';

async function prepareImage(file) {
  const { file: preparedFile } = await prepareImageForStorage(file);
  return readFileAsDataUrl(preparedFile);
}

export function SafeImage({ src, alt, className, fallback = null }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return fallback;
  return <img className={className} src={src} alt={alt} onError={() => setFailed(true)} />;
}

export default function ImageUploadField({
  id,
  value = '',
  onChange,
  label = 'Image URL (optional)',
  className = '',
  required = false,
  onFileSelected,
  selectedFileName = '',
  previewUrl = '',
  disabled = false,
  message: externalMessage = '',
  messageType = 'status',
}) {
  const [message, setMessage] = useState('');
  const uploaded = value.startsWith('data:image/');
  const visibleMessage = externalMessage || message;
  const visiblePreviewUrl = previewUrl || value;
  const hasFileMode = typeof onFileSelected === 'function';

  async function chooseImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      validateImageFile(file);
      if (hasFileMode) {
        onFileSelected(file);
        setMessage('Photo selected and ready to save.');
      } else {
        setMessage('Preparing image...');
        onChange(await prepareImage(file));
        setMessage('Photo selected and ready to save.');
      }
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
        disabled={disabled}
        onChange={(event) => { onChange(event.target.value); setMessage(''); }} />
      <span className="image-choice-label">or choose a photo from your device</span>
      <input id={`${id}-file`} className="image-file-input" type="file" accept={imageAcceptAttribute}
        onChange={chooseImage} aria-describedby={`${id}-help`} disabled={disabled} />
      <small id={`${id}-help`}>JPEG, PNG, WebP, HEIC, and HEIF photos are accepted. Large photos are reduced automatically when the browser can process them.</small>
      {selectedFileName && <small className="image-upload-filename">Selected: {selectedFileName}</small>}
      {visibleMessage && (
        <small className={messageType === 'error' ? 'image-upload-error' : 'image-upload-message'}
          role={messageType === 'error' ? 'alert' : 'status'}>
          {visibleMessage}
        </small>
      )}
      {visiblePreviewUrl && <div className="image-upload-preview">
        <SafeImage key={visiblePreviewUrl} src={visiblePreviewUrl} alt="Selected preview"
          fallback={<div className="image-preview-fallback">Photo selected</div>} />
        <button className="secondary-button" type="button" disabled={disabled}
          onClick={() => {
            if (hasFileMode) onFileSelected(null);
            onChange('');
            setMessage('Image removed.');
          }}>
          Remove image
        </button>
      </div>}
    </div>
  );
}
