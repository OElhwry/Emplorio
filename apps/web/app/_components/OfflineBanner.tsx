'use client';

import { useEffect, useState } from 'react';
import styles from './OfflineBanner.module.css';

/**
 * A slim fixed banner that appears when the browser goes offline, so network
 * failures read as "you're offline" rather than an opaque error mid-task.
 */
export function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  if (!offline) return null;
  return (
    <div className={styles.banner} role="status" aria-live="polite">
      <span className={styles.dot} aria-hidden="true" />
      You appear to be offline. Changes will sync once you reconnect.
    </div>
  );
}
