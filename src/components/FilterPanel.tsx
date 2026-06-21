import { useState } from "react";
import type { FieldDef } from "../utils/fields";
import { FIELDS, DEFAULT_VISIBLE_FIELDS } from "../utils/fields";
import { X, Plus, ChevronDown, ChevronUp, Search } from "lucide-react";

interface ExcludeKeyword {
  id: string;
  field: string;
  phrase: string;
}

interface Props {
  tipoContrato: string;
  setTipoContrato: (v: string) => void;
  visibleFields: Set<string>;
  setVisibleFields: (v: Set<string>) => void;
  excludeKeywords: ExcludeKeyword[];
  setExcludeKeywords: (v: ExcludeKeyword[]) => void;
  contractTypes: string[];
}

const FIELD_GROUPS = [
  { label: "Entidad", fields: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
  { label: "Contrato", fields: [10, 11, 12, 13, 14, 15, 16, 17, 18, 67, 68, 72, 73] },
  { label: "Fechas", fields: [19, 20, 21, 62, 65, 66, 73] },
  { label: "Proveedor", fields: [23, 24, 25, 26, 27, 64] },
  { label: "Financiero", fields: [35, 36, 37, 38, 39, 40, 41, 42, 43, 44] },
  { label: "Presupuesto", fields: [33, 34, 56, 57, 58, 59, 60, 61] },
  { label: "Rep. Legal", fields: [50, 51, 52, 53, 54, 55] },
  { label: "Supervisión", fields: [74, 75, 76, 77, 78, 79, 80, 81, 82] },
  { label: "Otros", fields: [22, 28, 29, 30, 31, 32, 45, 46, 47, 48, 49, 63, 69, 70, 71, 83, 84] },
];

export default function FilterPanel({
  tipoContrato, setTipoContrato,
  visibleFields, setVisibleFields,
  excludeKeywords, setExcludeKeywords,
  contractTypes,
}: Props) {
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set(["Contrato", "Financiero"]));
  const [fieldSearch, setFieldSearch] = useState("");
  const [newPhrase, setNewPhrase] = useState("");
  const [newField, setNewField] = useState("objeto_del_contrato");

  const toggleGroup = (g: string) => {
    const next = new Set(openGroups);
    next.has(g) ? next.delete(g) : next.add(g);
    setOpenGroups(next);
  };

  const toggleField = (apiField: string) => {
    const next = new Set(visibleFields);
    next.has(apiField) ? next.delete(apiField) : next.add(apiField);
    setVisibleFields(next);
  };

  const selectAll = () => setVisibleFields(new Set(FIELDS.map(f => f.apiField)));
  const selectDefault = () => setVisibleFields(new Set(DEFAULT_VISIBLE_FIELDS));
  const clearAll = () => setVisibleFields(new Set());

  const addKeyword = () => {
    if (!newPhrase.trim()) return;
    setExcludeKeywords([
      ...excludeKeywords,
      { id: crypto.randomUUID(), field: newField, phrase: newPhrase.trim() },
    ]);
    setNewPhrase("");
  };

  const removeKeyword = (id: string) => {
    setExcludeKeywords(excludeKeywords.filter(k => k.id !== id));
  };

  const filteredFields = (nums: number[]): FieldDef[] => {
    const all = nums.map(n => FIELDS.find(f => f.num === n)!).filter(Boolean);
    if (!fieldSearch.trim()) return all;
    const q = fieldSearch.toLowerCase();
    return all.filter(f => f.label.toLowerCase().includes(q) || f.apiField.toLowerCase().includes(q));
  };

  return (
    <aside className="filter-panel">
      <div className="panel-section">
        <h3 className="section-title">Tipo de Contrato</h3>
        <select
          className="select-input"
          value={tipoContrato}
          onChange={e => setTipoContrato(e.target.value)}
        >
          <option value="">— Todos los tipos —</option>
          {contractTypes.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="panel-section">
        <h3 className="section-title">Filtro de Exclusión</h3>
        <p className="section-hint">Excluye contratos que contengan estas frases en el campo seleccionado.</p>

        <select
          className="select-input"
          value={newField}
          onChange={e => setNewField(e.target.value)}
        >
          {FIELDS.filter(f => f.type === "text").map(f => (
            <option key={f.apiField} value={f.apiField}>{f.label}</option>
          ))}
        </select>

        <div className="keyword-input-row">
          <input
            className="text-input"
            placeholder="Frase a excluir..."
            value={newPhrase}
            onChange={e => setNewPhrase(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addKeyword()}
          />
          <button className="btn-icon" onClick={addKeyword} title="Agregar">
            <Plus size={16} />
          </button>
        </div>

        <div className="keyword-list">
          {excludeKeywords.map(kw => {
            const fieldLabel = FIELDS.find(f => f.apiField === kw.field)?.label ?? kw.field;
            return (
              <div key={kw.id} className="keyword-tag">
                <span className="keyword-field">{fieldLabel}:</span>
                <span className="keyword-phrase">{kw.phrase}</span>
                <button className="btn-remove" onClick={() => removeKeyword(kw.id)}>
                  <X size={12} />
                </button>
              </div>
            );
          })}
          {!excludeKeywords.length && (
            <p className="empty-hint">Sin filtros de exclusión activos.</p>
          )}
        </div>
      </div>

      <div className="panel-section">
        <div className="section-title-row">
          <h3 className="section-title">Columnas visibles</h3>
          <div className="btn-group">
            <button className="btn-xs" onClick={selectDefault}>Default</button>
            <button className="btn-xs" onClick={selectAll}>Todo</button>
            <button className="btn-xs" onClick={clearAll}>Ninguno</button>
          </div>
        </div>

        <div className="search-box">
          <Search size={13} />
          <input
            className="search-input"
            placeholder="Buscar campo..."
            value={fieldSearch}
            onChange={e => setFieldSearch(e.target.value)}
          />
        </div>

        <div className="field-groups">
          {FIELD_GROUPS.map(group => {
            const fields = filteredFields(group.fields);
            if (fieldSearch && !fields.length) return null;
            const isOpen = openGroups.has(group.label) || !!fieldSearch;
            const checkedCount = fields.filter(f => visibleFields.has(f.apiField)).length;
            return (
              <div key={group.label} className="field-group">
                <button
                  className="group-header"
                  onClick={() => toggleGroup(group.label)}
                >
                  <span>{group.label}</span>
                  <span className="group-count">{checkedCount}/{fields.length}</span>
                  {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
                {isOpen && (
                  <div className="field-list">
                    {fields.map(f => (
                      <label key={f.apiField} className="field-checkbox">
                        <input
                          type="checkbox"
                          checked={visibleFields.has(f.apiField)}
                          onChange={() => toggleField(f.apiField)}
                        />
                        <span className="field-label" title={f.description}>{f.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
