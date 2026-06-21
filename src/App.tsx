import { useState, useEffect, useMemo } from "react";
import FilterPanel from "./components/FilterPanel";
import DataTable from "./components/DataTable";
import { useSecop } from "./hooks/useSecop";
import { FIELDS, DEFAULT_VISIBLE_FIELDS } from "./utils/fields";
import { exportToCSV, exportToExcel } from "./utils/export";
import { Download, Database, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import "./index.css";

const CONTRACT_TYPES_URL =
  "https://www.datos.gov.co/resource/jbjy-vk9h.json?$select=tipo_de_contrato&$group=tipo_de_contrato&$limit=100";

interface ExcludeKeyword {
  id: string;
  field: string;
  phrase: string;
}

export default function App() {
  const [tipoContrato, setTipoContrato] = useState("");
  const [visibleFields, setVisibleFields] = useState<Set<string>>(
    new Set(DEFAULT_VISIBLE_FIELDS)
  );
  const [excludeKeywords, setExcludeKeywords] = useState<ExcludeKeyword[]>([]);
  const [contractTypes, setContractTypes] = useState<string[]>([]);
  const [exportLoading, setExportLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    fetch(CONTRACT_TYPES_URL)
      .then((r) => r.json())
      .then((rows: { tipo_de_contrato?: string }[]) => {
        const types = rows
          .map((r) => r.tipo_de_contrato ?? "")
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b, "es"));
        setContractTypes(types);
      })
      .catch(() => {});
  }, []);

  const secopParams = useMemo(
    () => ({
      tipoContrato,
      excludeKeywords: excludeKeywords.map((k) => ({
        field: k.field,
        phrase: k.phrase,
      })),
    }),
    [tipoContrato, excludeKeywords]
  );

  const { data, total, loading, error, fetchAll, page, setPage, pageSize } =
    useSecop(secopParams);

  const activeFields = useMemo(
    () => FIELDS.filter((f) => visibleFields.has(f.apiField)),
    [visibleFields]
  );

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleExportCSV = async () => {
    setExportLoading(true);
    await fetchAll();
    exportToCSV(data, activeFields);
    setExportLoading(false);
  };

  const handleExportExcel = async () => {
    setExportLoading(true);
    await fetchAll();
    exportToExcel(data, activeFields);
    setExportLoading(false);
  };

  const pageButtons = useMemo(() => {
    const pages: number[] = [];
    const start = Math.max(0, Math.min(page - 2, totalPages - 5));
    const end = Math.min(totalPages - 1, start + 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [page, totalPages]);

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="header-left">
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen((o) => !o)}
            title={sidebarOpen ? "Ocultar panel" : "Mostrar panel"}
          >
            <span className="toggle-bar" />
            <span className="toggle-bar" />
            <span className="toggle-bar" />
          </button>
          <div className="header-brand">
            <Database size={20} className="brand-icon" />
            <div>
              <h1 className="app-title">SECOP II — Optimizador de Contratos</h1>
              <p className="app-subtitle">
                Analiza y optimiza tus queries a la API de SECOP
              </p>
            </div>
          </div>
        </div>

        <div className="header-right">
          {tipoContrato && (
            <span className="badge-tipo">{tipoContrato}</span>
          )}
          {excludeKeywords.length > 0 && (
            <span className="badge-excl">
              {excludeKeywords.length} exclusión
              {excludeKeywords.length > 1 ? "es" : ""}
            </span>
          )}
          <span className="total-count">
            {loading
              ? "Cargando..."
              : `${total.toLocaleString("es-CO")} contratos`}
          </span>
          <button
            className="btn-export"
            onClick={handleExportCSV}
            disabled={exportLoading || loading}
            title="Exportar CSV"
          >
            <Download size={13} />
            CSV
          </button>
          <button
            className="btn-export btn-excel"
            onClick={handleExportExcel}
            disabled={exportLoading || loading}
            title="Exportar Excel"
          >
            <Download size={13} />
            Excel
          </button>
        </div>
      </header>

      <div className="main-content">
        {sidebarOpen && (
          <FilterPanel
            tipoContrato={tipoContrato}
            setTipoContrato={setTipoContrato}
            visibleFields={visibleFields}
            setVisibleFields={setVisibleFields}
            excludeKeywords={excludeKeywords}
            setExcludeKeywords={setExcludeKeywords}
            contractTypes={contractTypes}
          />
        )}

        <div className="table-area">
          {error && (
            <div className="error-banner">
              <AlertCircle size={15} />
              <span>Error al cargar datos: {error}</span>
            </div>
          )}

          <DataTable
            data={data}
            visibleFields={visibleFields}
            loading={loading}
          />

          <div className="pagination">
            <span className="pagination-info">
              Página {page + 1} de {totalPages} · {data.length} de{" "}
              {total.toLocaleString("es-CO")} registros (
              {pageSize.toLocaleString("es-CO")} por página)
            </span>
            <div className="pagination-controls">
              <button
                className="btn-page"
                disabled={page === 0 || loading}
                onClick={() => setPage(0)}
              >
                «
              </button>
              <button
                className="btn-page"
                disabled={page === 0 || loading}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft size={13} />
              </button>
              {pageButtons.map((p) => (
                <button
                  key={p}
                  className={`btn-page ${p === page ? "active" : ""}`}
                  onClick={() => setPage(p)}
                  disabled={loading}
                >
                  {p + 1}
                </button>
              ))}
              <button
                className="btn-page"
                disabled={page >= totalPages - 1 || loading}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight size={13} />
              </button>
              <button
                className="btn-page"
                disabled={page >= totalPages - 1 || loading}
                onClick={() => setPage(totalPages - 1)}
              >
                »
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
