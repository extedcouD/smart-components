import './globals.css';
import { RootProvider } from 'fumadocs-ui/provider';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'smart-components — headless React AI components',
  description:
    'Headless React components powered by an LLM. Ghost completion, AI suggestions, rewrite. Provider-agnostic. Mobile-first.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col antialiased">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
