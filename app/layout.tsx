import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kabina · Pěstební dělníci A',
  description: 'Týmová kabina Pěstebních dělníků A — Hanspaulská liga.'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="cs"><body>{children}</body></html>;
}
