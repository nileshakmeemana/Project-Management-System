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
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
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

          /* ── Critical: buttons render correctly before globals.css loads ── */
          :root{
            --p-fill-brand:#303030;
            --p-text-brand-on-fill:#ffffff;
            --p-surface:#ffffff;
            --p-text:#303030;
            --p-border:#e3e3e3;
            --p-border-radius-150:.375rem;
            --p-space-100:.25rem;
            --p-space-200:.5rem;
            --p-space-300:.75rem;
            --p-space-400:1rem;
            --p-font-size-325:.8125rem;
            --p-font-weight-medium:550;
            --p-font-weight-semibold:600;
            --p-font-family-sans:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
            --p-shadow-button:0 -.0625rem 0 0 #b5b5b5 inset,0 0 0 .0625rem #0000001a inset,0 .03125rem 0 .09375rem #fff inset;
            --p-shadow-button-primary:0 -.0625rem 0 .0625rem #000000cc inset,0 0 0 .0625rem #303030 inset,0 .03125rem 0 .09375rem #ffffff40 inset;
          }
          .btn-primary{
            display:inline-flex;align-items:center;gap:.25rem;
            background:#303030;color:#fff;border:none;
            border-radius:.375rem;padding:0 .75rem;height:2rem;
            font-size:.8125rem;font-weight:600;font-family:inherit;
            cursor:pointer;white-space:nowrap;line-height:1;text-decoration:none;
            box-shadow:0 -.0625rem 0 .0625rem #000000cc inset,0 0 0 .0625rem #303030 inset;
          }
          .btn-primary:hover{background:#1a1a1a;}
          .btn-secondary,a.btn-secondary{
            display:inline-flex;align-items:center;gap:.25rem;
            background:#fff;color:#303030;border:none;
            border-radius:.375rem;padding:0 .75rem;height:2rem;
            font-size:.8125rem;font-weight:550;font-family:inherit;
            cursor:pointer;white-space:nowrap;line-height:1;text-decoration:none;
            box-shadow:0 -.0625rem 0 0 #b5b5b5 inset,0 0 0 .0625rem #0000001a inset,0 .03125rem 0 .09375rem #fff inset;
          }
          .btn-secondary:hover,a.btn-secondary:hover{background:#f7f7f7;}
          /* Card header layout - prevents View All button position flash */
          .p-card-header{display:flex;align-items:center;justify-content:space-between;gap:.5rem;padding:.75rem 1rem;border-bottom:.0625rem solid #e3e3e3;min-height:2.75rem;}
          .p-card-title{display:flex;align-items:center;gap:.375rem;font-size:.8125rem;font-weight:600;color:#303030;}
          .pt-bulk-bar{display:none;align-items:center;gap:.75rem;background:#fff;border:.0625rem solid #e3e3e3;border-top:none;border-bottom:none;padding:.5rem .75rem;}
          .pt-bulk-bar.visible{display:flex;}
          .pt-bulk-count{font-size:.8125rem;font-weight:550;color:#303030;}
          .pt-bulk-actions{display:flex;gap:.5rem;}
          .pt-btn-critical{color:#8e0b21!important;}
          /* Topbar logo always visible */
          .topbar-logo{display:flex;align-items:center;gap:.5rem;padding-left:1.25rem;cursor:pointer;}
          .topbar-logo img{height:1.75rem;width:auto;display:block;}
        ` }} />
      </head>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
