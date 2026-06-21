import { useState, useEffect, useCallback, useRef } from "react";

const BASE_URL = "https://www.datos.gov.co/resource/jbjy-vk9h.json";
const PAGE_SIZE = 1000;

export interface SecopParams {
  tipoContrato: string;
  excludeKeywords: { field: string; phrase: string }[];
}

export interface SecopResult {
  data: Record<string, unknown>[];
  total: number;
  loading: boolean;
  error: string | null;
  fetchAll: () => void;
  page: number;
  setPage: (p: number) => void;
  pageSize: number;
}

function buildQuery(params: SecopParams, offset: number): string {
  const url = new URL(BASE_URL);
  url.searchParams.set("$limit", String(PAGE_SIZE));
  url.searchParams.set("$offset", String(offset));

  const whereClauses: string[] = [];

  if (params.tipoContrato) {
    whereClauses.push(`tipo_de_contrato='${params.tipoContrato.replace(/'/g, "''")}'`);
  }

  for (const kw of params.excludeKeywords) {
    if (kw.phrase.trim()) {
      const escaped = kw.phrase.trim().replace(/'/g, "''").toLowerCase();
      whereClauses.push(`lower(${kw.field}) not like '%${escaped}%'`);
    }
  }

  if (whereClauses.length) {
    url.searchParams.set("$where", whereClauses.join(" AND "));
  }

  return url.toString();
}

export function useSecop(params: SecopParams): SecopResult {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const fetchPage = useCallback(async (p: number, currentParams: SecopParams) => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const url = buildQuery(currentParams, p * PAGE_SIZE);
      const countUrl = new URL(BASE_URL);
      countUrl.searchParams.set("$select", "count(*)");
      const whereClauses: string[] = [];
      if (currentParams.tipoContrato) {
        whereClauses.push(`tipo_de_contrato='${currentParams.tipoContrato.replace(/'/g, "''")}'`);
      }
      for (const kw of currentParams.excludeKeywords) {
        if (kw.phrase.trim()) {
          const escaped = kw.phrase.trim().replace(/'/g, "''").toLowerCase();
          whereClauses.push(`lower(${kw.field}) not like '%${escaped}%'`);
        }
      }
      if (whereClauses.length) {
        countUrl.searchParams.set("$where", whereClauses.join(" AND "));
      }

      const [dataRes, countRes] = await Promise.all([
        fetch(url, { signal: abortRef.current.signal }),
        fetch(countUrl.toString(), { signal: abortRef.current.signal }),
      ]);

      if (!dataRes.ok) throw new Error(`API error: ${dataRes.status} ${dataRes.statusText}`);
      const rows = await dataRes.json();
      const countJson = await countRes.json();
      const totalCount = parseInt(countJson[0]?.count ?? "0", 10);

      setData(rows);
      setTotal(totalCount);
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") {
        setError(e.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(0);
    fetchPage(0, params);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.tipoContrato, JSON.stringify(params.excludeKeywords)]);

  const handleSetPage = useCallback((p: number) => {
    setPage(p);
    fetchPage(p, params);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchPage, params.tipoContrato, JSON.stringify(params.excludeKeywords)]);

  const fetchAll = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const allData: Record<string, unknown>[] = [];
      let offset = 0;
      while (true) {
        const url = buildQuery(params, offset);
        const res = await fetch(url, { signal: abortRef.current.signal });
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        const rows = await res.json();
        if (!rows.length) break;
        allData.push(...rows);
        if (rows.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }
      setData(allData);
      setTotal(allData.length);
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") setError(e.message);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.tipoContrato, JSON.stringify(params.excludeKeywords)]);

  return { data, total, loading, error, fetchAll, page, setPage: handleSetPage, pageSize: PAGE_SIZE };
}
