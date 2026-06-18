import '@/styles/auth.css';
import ClientOnly from '@/components/ClientOnly';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClientOnly fallbackBg="#f1f1f1">
      <div style={{
        minHeight: '100vh',
        background: '#f1f1f1',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
      }}>
        {children}
      </div>
    </ClientOnly>
  );
}
