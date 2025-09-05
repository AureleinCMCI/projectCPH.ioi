'use client';

import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { BottomNavBar } from '../../component/navbar';

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  const pathname = usePathname();
  const hideNavbar = pathname === '/'; // Masque la Navbar sur la page d'accueil (login)

  return (
    <html lang="fr">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </head>
      <body>
        <MantineProvider>
          <div style={{ display: 'flex', minHeight: '100vh' }}>
            {!hideNavbar && <BottomNavBar />}
            <main style={{ flex: 1, padding: '24px' }}>
              {children}
            </main>
          </div>
        </MantineProvider>
      </body>
    </html>
  );
}