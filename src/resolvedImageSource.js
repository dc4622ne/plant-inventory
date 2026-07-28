import { useEffect, useState } from 'react';
import { getImageAsset, localImageAssetPrefix } from './imageAssetStore';

export function useResolvedImageSource(source) {
  const [resolvedSource, setResolvedSource] = useState(
    source?.startsWith(localImageAssetPrefix) ? '' : source,
  );

  useEffect(() => {
    let active = true;
    let objectUrl = '';
    if (!source?.startsWith(localImageAssetPrefix)) {
      setResolvedSource(source);
      return undefined;
    }
    setResolvedSource('');
    getImageAsset(source).then((blob) => {
      if (!active || !blob) return;
      objectUrl = URL.createObjectURL(blob);
      setResolvedSource(objectUrl);
    }).catch(() => {
      if (active) setResolvedSource('');
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [source]);

  return resolvedSource;
}
