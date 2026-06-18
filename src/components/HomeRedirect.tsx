'use client';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, getUser } from '@/lib/api';

export default function HomeRedirect() {
  const router = useRouter();
  const done   = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const token = getToken();
    const user  = getUser();
    if (token && user) router.replace(user.role === 'admin' ? '/admin' : '/employee');
    else router.replace('/auth');
  }, []);
  return <div style={{ minHeight:'100vh', background:'#1a1a1a' }} />;
}
