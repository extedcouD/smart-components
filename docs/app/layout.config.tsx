import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

// Storybook is NOT a Next route — raw <a> doesn't get basePath, so prefix manually.
const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: (
      <span className="font-semibold">
        smart-components
      </span>
    ),
  },
  links: [
    {
      text: 'Docs',
      url: '/docs',
      active: 'nested-url',
    },
    {
      text: 'Smart State ✦',
      url: '/docs/smart-state',
      active: 'nested-url',
    },
    {
      text: 'Playground',
      url: `${base}/storybook/`,
      external: true,
    },
    {
      text: 'GitHub',
      url: 'https://github.com/extedcouD/smart-components',
      external: true,
    },
  ],
};
