'use client';
import { useState, useEffect } from 'react';

interface Props {
  children: React.ReactNode;
  fallbackBg?: string;
}

export default function ClientOnly({ children, fallbackBg = '#1a1a1a' }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return <div style={{ minHeight: '100vh', background: fallbackBg }} />;
  }
  return <>{children}</>;
}
