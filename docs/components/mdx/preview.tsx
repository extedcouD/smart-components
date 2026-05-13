import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';
import type { ReactNode } from 'react';

export interface PreviewProps {
  demo: ReactNode;
  source: string;
  lang?: string;
}

export function Preview({ demo, source, lang = 'tsx' }: PreviewProps) {
  return (
    <Tabs items={['Preview', 'Code']} defaultIndex={0}>
      <Tab value="Preview">
        <div className="demo-surface not-prose flex min-h-[180px] items-center justify-center rounded-md border border-fd-border p-8">
          {demo}
        </div>
      </Tab>
      <Tab value="Code">
        <DynamicCodeBlock lang={lang} code={source} />
      </Tab>
    </Tabs>
  );
}
