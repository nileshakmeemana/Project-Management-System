import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Designer Craft Portal',
  description: 'Employee & Admin management portal',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Inter — exact same URL as HTML source files */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@3.26.0/dist/tabler-icons.min.css"
        />
        {/*
          Inline critical CSS — must render before any JS loads.
          DO NOT set background here — each route sets its own background:
            auth/* → #f1f1f1 via ClientOnly fallbackBg
            admin/employee/* → #1a1a1a via ClientOnly fallbackBg
        */}
        <style dangerouslySetInnerHTML={{ __html: `
          *,*::before,*::after{box-sizing:border-box;}
          html,body{margin:0;padding:0;min-height:100vh;}
          body{font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
        ` }} />
      </head>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
