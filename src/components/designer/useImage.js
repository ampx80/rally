// designer/useImage.js
// Load an HTMLImageElement with crossOrigin='anonymous' so the Konva canvas
// stays exportable (a cross-origin image without CORS taints the canvas and
// makes toDataURL throw). Same-origin, data URLs and object URLs are always safe.

import { useEffect, useState } from 'react';

export default function useImage(src) {
  const [img, setImg] = useState(null);
  const [status, setStatus] = useState('empty'); // empty | loading | loaded | failed
  useEffect(() => {
    if (!src) { setImg(null); setStatus('empty'); return; }
    let alive = true;
    setStatus('loading');
    const image = new window.Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => { if (alive) { setImg(image); setStatus('loaded'); } };
    image.onerror = () => { if (alive) { setImg(null); setStatus('failed'); } };
    image.src = src;
    return () => { alive = false; };
  }, [src]);
  return [img, status];
}
