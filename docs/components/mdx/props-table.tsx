import type { ReactNode } from 'react';

export interface PropRow {
  name: string;
  type: string;
  default?: string;
  required?: boolean;
  description: ReactNode;
}

export interface PropsTableProps {
  rows: ReadonlyArray<PropRow>;
}

export function PropsTable({ rows }: PropsTableProps) {
  return (
    <div className="not-prose my-6 overflow-x-auto rounded-md border border-fd-border">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-fd-secondary/50 text-xs uppercase tracking-wide text-fd-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Prop</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Default</th>
            <th className="px-4 py-3 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.name}
              className="border-t border-fd-border align-top"
            >
              <td className="px-4 py-3 font-mono text-[13px]">
                <span className="font-medium">{row.name}</span>
                {row.required ? (
                  <span className="ml-1 text-red-500" title="required">
                    *
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-3 font-mono text-[12px] text-fd-muted-foreground">
                {row.type}
              </td>
              <td className="px-4 py-3 font-mono text-[12px] text-fd-muted-foreground">
                {row.default ?? '—'}
              </td>
              <td className="px-4 py-3 text-fd-foreground">{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
