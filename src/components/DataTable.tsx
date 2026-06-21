import { useMemo, useState, useRef, useEffect } from "react";
import {
  useReactTable, getCoreRowModel, getFilteredRowModel,
  getSortedRowModel, getFacetedRowModel, flexRender,
} from "@tanstack/react-table";
import type { ColumnDef, SortingState, ColumnFiltersState, Column } from "@tanstack/react-table";
import type { FieldDef } from "../utils/fields";
import { FIELDS } from "../utils/fields";
import { ChevronUp, ChevronDown, ChevronsUpDown, Filter } from "lucide-react";

interface Props {
  data: Record<string, unknown>[];
  visibleFields: Set<string>;
  loading: boolean;
}

function ColumnFilterPopover({ column }: { column: Column<Record<string, unknown>> }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const filterValue = (column.getFilterValue() as string[] | undefined) ?? [];

  const facetedModel = column.getFacetedRowModel();
  const uniqueValues: string[] = useMemo(() => {
    const vals = new Set<string>();
    facetedModel.rows.forEach(row => {
      const v = row.getValue(column.id);
      vals.add(v == null || v === "" ? "—" : String(v));
    });
    return Array.from(vals).sort((a, b) => a.localeCompare(b, "es"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facetedModel]);

  const filtered = search
    ? uniqueValues.filter(v => v.toLowerCase().includes(search.toLowerCase()))
    : uniqueValues;

  const toggle = (val: string) => {
    const next = filterValue.includes(val)
      ? filterValue.filter(v => v !== val)
      : [...filterValue, val];
    column.setFilterValue(next.length ? next : undefined);
  };

  const selectAll = () => column.setFilterValue(undefined);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const active = filterValue.length > 0;

  return (
    <div ref={ref} className="col-filter-wrap">
      <button
        className={`col-filter-btn ${active ? "active" : ""}`}
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        title="Filtrar columna"
      >
        <Filter size={11} />
        {active && <span className="filter-badge">{filterValue.length}</span>}
      </button>
      {open && (
        <div className="col-filter-popover">
          <input
            className="col-filter-search"
            placeholder="Buscar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onClick={e => e.stopPropagation()}
          />
          <div className="col-filter-options">
            <label className="col-filter-option">
              <input type="checkbox" checked={filterValue.length === 0} onChange={selectAll} />
              <span>(Todos)</span>
            </label>
            {filtered.map(val => (
              <label key={val} className="col-filter-option">
                <input
                  type="checkbox"
                  checked={filterValue.includes(val)}
                  onChange={() => toggle(val)}
                />
                <span title={val}>{val.length > 40 ? val.slice(0, 40) + "…" : val}</span>
              </label>
            ))}
          </div>
          {active && (
            <button className="col-filter-clear" onClick={selectAll}>Limpiar filtro</button>
          )}
        </div>
      )}
    </div>
  );
}

export default function DataTable({ data, visibleFields, loading }: Props) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  const activeFields = useMemo(
    () => FIELDS.filter(f => visibleFields.has(f.apiField)),
    [visibleFields]
  );

  const columns = useMemo<ColumnDef<Record<string, unknown>>[]>(
    () =>
      activeFields.map((field: FieldDef) => ({
        id: field.apiField,
        accessorFn: (row: Record<string, unknown>) => {
          const v = row[field.apiField];
          if (v == null || v === "") return "—";
          if (field.type === "number") {
            const n = Number(v);
            return isNaN(n) ? String(v) : n.toLocaleString("es-CO");
          }
          if (field.type === "datetime") {
            const d = new Date(String(v));
            return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString("es-CO");
          }
          return String(v);
        },
        header: field.label,
        filterFn: (row, columnId, filterValue: string[]) => {
          if (!filterValue || !filterValue.length) return true;
          const val = String(row.getValue(columnId) ?? "—");
          return filterValue.includes(val);
        },
        cell: (info) => {
          const val = info.getValue() as string;
          if (field.type === "url" && val !== "—") {
            return (
              <a href={val} target="_blank" rel="noopener noreferrer" className="url-link">
                Ver proceso
              </a>
            );
          }
          return <span title={val} className="cell-text">{val}</span>;
        },
        size: field.type === "number" ? 130 : field.type === "datetime" ? 110 : 180,
      })),
    [activeFields]
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
  });

  const activeFilterCount = columnFilters.length;

  return (
    <div className="table-wrapper">
      {activeFilterCount > 0 && (
        <div className="active-filters-bar">
          <span>{activeFilterCount} filtro(s) de columna activo(s)</span>
          <button onClick={() => setColumnFilters([])} className="btn-clear-all-filters">
            Limpiar todos
          </button>
        </div>
      )}
      <div className="table-scroll">
        {loading && <div className="table-overlay"><div className="spinner" /></div>}
        <table className="data-table">
          <thead>
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(header => (
                  <th
                    key={header.id}
                    style={{ minWidth: header.column.columnDef.size }}
                    className="th"
                  >
                    <div className="th-content">
                      <span
                        className="th-label"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === "asc" ? (
                          <ChevronUp size={12} className="sort-icon" />
                        ) : header.column.getIsSorted() === "desc" ? (
                          <ChevronDown size={12} className="sort-icon" />
                        ) : (
                          <ChevronsUpDown size={12} className="sort-icon muted" />
                        )}
                      </span>
                      <ColumnFilterPopover column={header.column} />
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, i) => (
              <tr key={row.id} className={i % 2 === 0 ? "row-even" : "row-odd"}>
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="td">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {!loading && !table.getRowModel().rows.length && (
              <tr>
                <td colSpan={columns.length} className="empty-row">
                  Sin resultados para los filtros aplicados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
