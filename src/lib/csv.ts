export interface CsvColumn<T> {
  key: keyof T;
  header: string;
  format?: (value: T[keyof T], row: T) => string;
}

// Formula/CSV injection: a cell opened in Excel/Sheets that starts with one
// of these characters runs as a formula regardless of the surrounding
// quoting — quoting alone doesn't stop it. Prefixing with an apostrophe is
// the standard mitigation (forces the cell to be read as literal text).
const FORMULA_TRIGGER_CHARS = ["=", "+", "-", "@", "\t", "\r"];

function escape(value: unknown): string {
  if (value === null || value === undefined) return "";
  let str = String(value);
  if (FORMULA_TRIGGER_CHARS.some((c) => str.startsWith(c))) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

export function toCsvGeneric<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escape(c.header)).join(",") + "\n";
  const body = rows
    .map((row) => columns.map((c) => escape(c.format ? c.format(row[c.key], row) : row[c.key])).join(","))
    .join("\n");
  return header + body;
}

export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
