import defaultComponents from 'fumadocs-ui/mdx';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { Callout } from 'fumadocs-ui/components/callout';
import { Preview } from './preview';
import { PropsTable } from './props-table';
import type { MDXComponents } from 'mdx/types';

export function getMDXComponents(extra?: MDXComponents): MDXComponents {
  return {
    ...defaultComponents,
    Tab,
    Tabs,
    Callout,
    Preview,
    PropsTable,
    ...extra,
  };
}
