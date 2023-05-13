import { FunctionComponent } from "react";

type Props<T extends { id: string }> = {
  rows: Array<T>;
  columns: Array<{
    id: string;
    name: string;
    Component: FunctionComponent<T>;
  }>;
};

export default function Table<T extends { id: string }>({
  rows,
  columns,
}: Props<T>) {
  return (
    <table className="block border-collapse overflow-x-auto">
      <thead className="sticky top-0 bg-gray-400">
        <tr>
          {columns.map((col) => (
            <th key={col.id}>{col.name}</th>
          ))}
        </tr>
      </thead>
      <tbody
        className={`
        [&>tr:hover]:bg-orange-200 [&>tr:not(:first-child)]:border-t-2
        [&>tr:not(:first-child)]:border-t-gray-400 [&_td:not(:first-child)]:border-l-2
        [&_td:not(:first-child)]:border-l-gray-200
        [&_td]:p-0.5
        [&_td]:px-2
      `}
      >
        {rows.map((row) => (
          <tr key={row.id}>
            {columns.map((col) => (
              <td key={col.id}>
                <col.Component {...row} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
