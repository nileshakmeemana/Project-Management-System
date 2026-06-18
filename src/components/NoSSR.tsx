'use client';
import { useEffect, useState } from 'react';

export default function NoSSR({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  
  if (!mounted) {
    // Return dark placeholder that matches the app background
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        background: '#1a1a1a',
        zIndex: 9999,
      }} />
    );
  }
  
  return <>{children}</>;
}
