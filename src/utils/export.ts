import * as XLSX from "xlsx";
import type { FieldDef } from "./fields";

export function exportToCSV(data: Record<string, unknown>[], visibleFields: FieldDef[]) {
  const headers = visibleFields.map(f => f.label);
  const rows = data.map(row =>
    visibleFields.map(f => row[f.apiField] ?? "")
  );
  const csv = [headers, ...rows]
    .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  download(csv, "contratos_secop.csv", "text/csv");
}

export function exportToExcel(data: Record<string, unknown>[], visibleFields: FieldDef[]) {
  const wsData = [
    visibleFields.map(f => f.label),
    ...data.map(row => visibleFields.map(f => row[f.apiField] ?? "")),
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Contratos");
  XLSX.writeFile(wb, "contratos_secop.xlsx");
}

function download(content: string, filename: string, type: string) {
  const blob = new Blob(["﻿" + content], { type: `${type};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
