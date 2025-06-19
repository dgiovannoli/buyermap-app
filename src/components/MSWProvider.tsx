'use client';

import { useEffect } from 'react';

export default function MSWProvider() {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_USE_MOCK === 'true' && typeof window !== 'undefined') {
      import('../mocks/browser').then(({ worker }) =>
        worker.start({
          serviceWorker: { url: '/mockServiceWorker.js' }
        })
      );
    }
  }, []);

  return null;
} 