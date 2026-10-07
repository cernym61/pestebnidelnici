import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kabina · Pěstební dělníci A',
  description: 'Týmová kabina Pěstebních dělníků A — Hanspaulská liga.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Pěstební A', statusBarStyle: 'default' },
  icons: { icon: '/icon-192.png', apple: '/icon-192.png' }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="cs"><head>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossOrigin="" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" crossOrigin="" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" crossOrigin="" />
  </head><body>{children}</body></html>;
}
