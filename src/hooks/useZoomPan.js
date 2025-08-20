// Placeholder zoom/pan hook with default values.
import { useState } from 'react';

export function useZoomPan() {
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState(0);
  return { scale, setScale, pan, setPan };
}
