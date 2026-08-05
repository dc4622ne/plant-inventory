import { useEffect, useState } from 'react';
import { getImageAsset, localImageAssetPrefix } from './imageAssetStore';
import { getPendingImageBlob, pendingImagePrefix, remoteImagePrefix, resolvePrivateImage } from './services/imageSyncService.js';

export function useResolvedImageSource(source, refreshKey = 0) {
  const [resolvedSource, setResolvedSource] = useState(
    source?.startsWith(localImageAssetPrefix) || source?.startsWith(remoteImagePrefix) || source?.startsWith(pendingImagePrefix) ? '' : source,
  );

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    if (!source?.startsWith(localImageAssetPrefix) && !source?.startsWith(remoteImagePrefix) && !source?.startsWith(pendingImagePrefix)) {
      setResolvedSource(source);
      return undefined;
    }
    setResolvedSource('');
    const resolve = source.startsWith(remoteImagePrefix)
      ? resolvePrivateImage(source, { force: refreshKey > 0 })
      : (source.startsWith(pendingImagePrefix) ? getPendingImageBlob(source) : getImageAsset(source));
    resolve.then((value) => {
      if (!active || !value) return;
      if (typeof value === 'string') setResolvedSource(value);
      else { objectUrl = URL.createObjectURL(value); setResolvedSource(objectUrl); }
    }).catch(() => {
      if (active) setResolvedSource('');
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [source, refreshKey]);

  return resolvedSource;
}
