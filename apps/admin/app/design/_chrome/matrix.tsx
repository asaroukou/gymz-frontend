import { Fragment, type ReactNode } from 'react';

/**
 * A variant x size grid with mono axis labels. Used inside a Specimen pane, so
 * it inherits that pane's theme and needs no colour of its own.
 */
export function Matrix<R extends string, C extends string>({
  rows,
  columns,
  rowAxis,
  columnAxis,
  render,
}: {
  rows: readonly R[];
  columns: readonly C[];
  rowAxis?: string;
  columnAxis?: string;
  render: (row: R, column: C) => ReactNode;
}) {
  return (
    <div
      className="grid w-full items-center gap-x-4 gap-y-3"
      style={{ gridTemplateColumns: `auto repeat(${columns.length}, minmax(0, 1fr))` }}
    >
      <span className="font-numeric text-[10px] text-muted-foreground">
        {rowAxis && columnAxis ? `${rowAxis} / ${columnAxis}` : (rowAxis ?? columnAxis ?? '')}
      </span>
      {columns.map((column) => (
        <span key={column} className="font-numeric text-[10px] text-muted-foreground">
          {column}
        </span>
      ))}

      {rows.map((row) => (
        <Fragment key={row}>
          <span className="font-numeric text-[10px] text-muted-foreground">{row}</span>
          {columns.map((column) => (
            <div key={`${row}-${column}`} className="min-w-0">
              {render(row, column)}
            </div>
          ))}
        </Fragment>
      ))}
    </div>
  );
}
