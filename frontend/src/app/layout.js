import '../styles/globals.css';
import { Toaster } from 'react-hot-toast';

export const metadata = {
  title: 'SafeNestT — Mia Investigation Platform',
  description: 'Fraud investigation, evidence collection, and case management by SafeNestT.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#0b0f1e',
              color: '#e0e8ff',
              border: '1px solid rgba(0,229,255,.2)',
              borderRadius: '12px',
            },
          }}
        />
      </body>
    </html>
  );
}
