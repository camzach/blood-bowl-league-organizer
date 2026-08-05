import classNames from "classnames";
import { FunctionComponent } from "react";

type Props<T extends { id: string }> = {
  rows: Array<T>;
  columns: Array<{
    id: string;
    name: string;
    Component: FunctionComponent<T>;
  }>;
  className?: string;
};

export default function Table<T extends { id: string }>({
  rows,
  columns,
  className,
}: Props<T>) {
  return (
    <div className="overflow-x-auto">
      <table className={classNames(["table-zebra table w-full", className])}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.id}>{col.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
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
    </div>
  );
}
