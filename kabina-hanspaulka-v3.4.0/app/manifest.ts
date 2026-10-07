import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Pěstební dělníci A · Kabina',
    short_name: 'Pěstební A',
    description: 'Týmová kabina Pěstebních dělníků A.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7f8f3',
    theme_color: '#153427',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
    ]
  };
}
