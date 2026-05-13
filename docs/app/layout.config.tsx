import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

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
      url: `${base}/docs`,
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
