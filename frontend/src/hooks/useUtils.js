import { useState, useEffect } from 'react';

/**
 * useDebounce — delays updating a value until after a wait period.
 * Useful for search inputs to avoid thrashing on every keystroke.
 */
export function useDebounce(value, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

/**
 * useWindowSize — reactive window dimensions.
 */
export function useWindowSize() {
  const [size, setSize] = useState({
    width:  window.innerWidth,
    height: window.innerHeight,
  });
  useEffect(() => {
    const handler = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return size;
}

/**
 * useIsMobile — true when viewport width < 640px.
 */
export function useIsMobile() {
  const { width } = useWindowSize();
  return width < 640;
}

/**
 * useCountUp — animates a number from 0 to target on mount.
 */
export function useCountUp(target, durationMs = 800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start   = null;
    const step  = (ts) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / durationMs, 1);
      setValue(Math.floor(progress * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, durationMs]);
  return value;
}
