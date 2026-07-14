const MAX_IMAGE_DIMENSION = 1600;
const RESIZE_THRESHOLD = 1_500_000;

export const acceptedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
export const imageAcceptAttribute = `${acceptedImageTypes.join(',')},.jpg,.jpeg,.png,.webp,.heic,.heif`;

export function readFileAsDataUrl(file) {
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

function normalizedImageType(file) {
  const explicitType = file.type?.toLowerCase();
  if (explicitType) return explicitType;

  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'jpg') return 'image/jpeg';
  if (extension === 'jpeg' || extension === 'png' || extension === 'webp' || extension === 'heic' || extension === 'heif') {
    return `image/${extension}`;
  }
  return '';
}

export function validateImageFile(file) {
  if (!(file instanceof File)) throw new Error('The selected photo was not received by the browser. Please choose it again.');

  const imageType = normalizedImageType(file);
  if (!acceptedImageTypes.includes(imageType)) {
    throw new Error('Please choose a JPEG, PNG, WebP, HEIC, or HEIF image.');
  }

  return imageType;
}

export async function prepareImageForStorage(file) {
  const imageType = validateImageFile(file);
  if (file.size <= RESIZE_THRESHOLD) return { file, contentType: imageType };

  try {
    const dataUrl = await readFileAsDataUrl(file);
    const image = await loadImage(dataUrl);
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((nextBlob) => {
        if (nextBlob) resolve(nextBlob);
        else reject(new Error('That image could not be compressed.'));
      }, 'image/jpeg', 0.82);
    });

    return {
      file: new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }),
      contentType: 'image/jpeg',
    };
  } catch (error) {
    if (imageType === 'image/heic' || imageType === 'image/heif') return { file, contentType: imageType };
    throw error;
  }
}
