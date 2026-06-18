'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, getUser } from '@/lib/api';

export default function Home() {
  const router  = useRouter();
  const done    = useRef(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (done.current) return;
    done.current = true;
    const token = getToken();
    const user  = getUser();
    if (token && user) {
      router.replace(user.role === 'admin' ? '/admin' : '/employee');
    } else {
      router.replace('/auth');
    }
  }, []);

  // Always show dark bg — never white flash
  return <div style={{ minHeight:'100vh', background:'#1a1a1a' }} />;
}
