# SECOP II — Optimizador de Contratos

Dashboard interactivo para explorar y filtrar contratos públicos del sistema SECOP II de Colombia.

## Características

- **Filtro por tipo de contrato** — dropdown dinámico cargado desde la API
- **Filtros de exclusión** — excluye contratos que contengan frases en cualquier campo de texto, aplicado via SoQL
- **84 columnas configurables** — activa/desactiva cualquier campo del dataset, agrupadas por categoría
- **Filtros por columna** — popover tipo Excel con checkboxes por valor único
- **Ordenamiento** — clic en encabezado de columna
- **Paginación** — 1000 registros por página con navegación completa
- **Exportación** — CSV y Excel con solo las columnas visibles

## Instalación

```bash
npm install
npm run dev
```

## API

Conecta a `https://www.datos.gov.co/resource/jbjy-vk9h.json` usando SoQL para filtrado server-side.
