import * as XLSX from 'xlsx';
import type {
  DashboardComponent,
  DashboardRow,
  DataMapping,
  DatasetColumn,
  MetricDefinition,
  ProjectConfig,
} from './types';

const STATUS_YEAR_RE = /^status_(\d{4})$/i;

export const FILTER_ALL = '__all__';

export function inferType(values: unknown[]): DatasetColumn['type'] {
  const sample = values.filter((value) => value !== null && value !== undefined && value !== '').slice(0, 25);
  if (!sample.length) return 'text';
  const numeric = sample.every((value) => !Number.isNaN(Number(value)));
  if (numeric) return 'number';
  return 'category';
}

export function normalizeStatus(value: unknown) {
  const raw = String(value ?? '').trim();
  if (!raw || raw === 'Neinițiat') return 'În planificare';
  if (raw === 'În proiectare' || raw === 'În licitație') return 'În planificare';
  return raw;
}

export function detectMapping(headers: string[]): DataMapping {
  const hasYearStatus = headers.some((header) => STATUS_YEAR_RE.test(header));
  if (!hasYearStatus) return { mode: 'direct' };
  return {
    mode: 'wideStatusByYear',
    routeCodeField: headers.find((h) => h === 'cod'),
    routeNameField: headers.find((h) => h === 'nume'),
    segmentField: headers.find((h) => h === 'segment_lot'),
    lengthField: headers.find((h) => h === 'lungime_segment_km'),
    totalLengthField: headers.find((h) => h === 'lungime_totala_traseu_km'),
    countyField: headers.find((h) => h === 'judete'),
    yearPrefix: 'status_',
  };
}

function numberValue(value: unknown) {
  if (typeof value === 'number') return value;
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeRows(sourceRows: Record<string, unknown>[], mapping: DataMapping): DashboardRow[] {
  if (mapping.mode !== 'wideStatusByYear') {
    return sourceRows.map((row) => ({ ...row } as DashboardRow));
  }

  const statusColumns = Object.keys(sourceRows[0] ?? {})
    .map((header) => ({ header, match: header.match(STATUS_YEAR_RE) }))
    .filter((item): item is { header: string; match: RegExpMatchArray } => Boolean(item.match))
    .sort((a, b) => Number(a.match[1]) - Number(b.match[1]));

  const rows: DashboardRow[] = [];
  sourceRows.forEach((source) => {
    statusColumns.forEach(({ header, match }) => {
      const code = String(source[mapping.routeCodeField || 'cod'] ?? '').trim();
      const name = String(source[mapping.routeNameField || 'nume'] ?? '').trim();
      const status = normalizeStatus(source[header]);
      rows.push({
        an: Number(match[1]),
        cod_ruta: code,
        nume_ruta: name,
        ruta: code && name ? `${code} - ${name}` : name || code || 'Nespecificat',
        judet: String(source[mapping.countyField || 'judete'] ?? ''),
        status,
        km: numberValue(source[mapping.lengthField || 'lungime_segment_km']),
        numar_segmente: 1,
        numar_total_loturi: 1,
        lungime_totala_km: numberValue(source[mapping.totalLengthField || 'lungime_totala_traseu_km']),
        segment_lot: String(source[mapping.segmentField || 'segment_lot'] ?? ''),
      });
    });
  });
  return rows;
}

export function columnsFromRows(rows: DashboardRow[]): DatasetColumn[] {
  const keys = Object.keys(rows[0] ?? {});
  return keys.map((name) => {
    const type =
      name === 'an'
        ? 'year'
        : name === 'km' || name === 'numar_segmente' || name === 'numar_total_loturi' || name === 'lungime_totala_km'
          ? 'number'
          : inferType(rows.map((row) => row[name]));
    return { name, label: name.replace(/_/g, ' '), type };
  });
}

export async function parseWorkbookFile(file: File) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const sourceRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
  return { sourceRows, sheetName };
}

export async function parseCsvFile(file: File) {
  const text = await file.text();
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(XLSX.read(text, { type: 'string' }).Sheets.Sheet1, {
    defval: null,
  });
  return { sourceRows: rows, sheetName: file.name };
}

export async function loadDemoWorkbook() {
  const response = await fetch('/tabel_master.xlsx');
  if (!response.ok) throw new Error('Nu am putut încărca tabel_master.xlsx din workspace.');
  const blob = await response.blob();
  const file = new File([blob], 'tabel_master.xlsx');
  return parseWorkbookFile(file);
}

export function defaultMetrics(): MetricDefinition[] {
  return [
    { id: 'total_km', label: 'Total km', aggregation: 'sum', field: 'km', suffix: ' km', color: '#2464bf' },
    { id: 'segmente', label: 'Segmente', aggregation: 'sum', field: 'numar_segmente', color: '#2464bf' },
    { id: 'loturi', label: 'Loturi', aggregation: 'sum', field: 'numar_total_loturi', color: '#2464bf' },
    {
      id: 'in_utilizare',
      label: 'În utilizare',
      aggregation: 'conditionalSum',
      field: 'km',
      conditionField: 'status',
      conditionValue: 'În utilizare',
      suffix: ' km',
      color: '#1f8f54',
    },
    {
      id: 'in_constructie',
      label: 'În construcție',
      aggregation: 'conditionalSum',
      field: 'km',
      conditionField: 'status',
      conditionValue: 'În construcție',
      suffix: ' km',
      color: '#df8b22',
    },
    {
      id: 'in_planificare',
      label: 'În planificare',
      aggregation: 'conditionalSum',
      field: 'km',
      conditionField: 'status',
      conditionValue: 'În planificare',
      suffix: ' km',
      color: '#2464bf',
    },
  ];
}

export function defaultComponents(): DashboardComponent[] {
  return [
    {
      id: 'cmp-filter',
      type: 'selective_filter',
      slot: 'filter',
      title: 'Filtre condiționale',
      subtitle: 'Schimbă anul, ruta, statusul și județul pentru a recalcula întregul dashboard.',
      fields: ['an', 'cod_ruta', 'nume_ruta', 'status', 'judet'],
      style: { titleSize: 22, titleColor: '#11213b', subtitleSize: 14, subtitleColor: '#6e8098' },
    },
    {
      id: 'cmp-kpi-km',
      type: 'kpi',
      slot: 'upper_left',
      title: 'Total km',
      metric: 'total_km',
      style: { titleSize: 22, titleColor: '#11213b', valueSize: 42, valueColor: '#2464bf' },
    },
    {
      id: 'cmp-kpi-seg',
      type: 'kpi',
      slot: 'upper_center',
      title: 'Segmente',
      metric: 'segmente',
      style: { titleSize: 22, titleColor: '#11213b', valueSize: 42, valueColor: '#2464bf' },
    },
    {
      id: 'cmp-kpi-lot',
      type: 'kpi',
      slot: 'upper_right',
      title: 'Loturi',
      metric: 'loturi',
      style: { titleSize: 22, titleColor: '#11213b', valueSize: 42, valueColor: '#2464bf' },
    },
    {
      id: 'cmp-progress',
      type: 'progress_status',
      slot: 'main_left',
      title: 'Progres pe rute',
      subtitle: 'Compoziția pe status pentru selecția curentă.',
      fields: ['in_utilizare', 'in_constructie', 'in_planificare'],
      style: { titleSize: 22, titleColor: '#11213b', subtitleSize: 14, subtitleColor: '#6e8098', valueSize: 34 },
    },
    {
      id: 'cmp-line',
      type: 'line_trend',
      slot: 'main_right',
      title: 'Trend valori',
      subtitle: 'Evoluția valorilor totale pe ani.',
      fields: ['in_utilizare', 'in_constructie', 'in_planificare'],
      style: { titleSize: 22, titleColor: '#11213b', subtitleSize: 14, subtitleColor: '#6e8098', showTooltip: true },
    },
    {
      id: 'cmp-donut',
      type: 'donut_status',
      slot: 'bottom_left',
      title: 'Status rețea',
      subtitle: 'Distribuție pe status pentru anul activ și filtrele curente.',
      fields: ['in_utilizare', 'in_constructie', 'in_planificare'],
      style: { titleSize: 22, titleColor: '#11213b', subtitleSize: 14, subtitleColor: '#6e8098', showTooltip: true },
    },
    {
      id: 'cmp-stacked',
      type: 'stacked_status',
      slot: 'bottom_left',
      title: 'Distribuție cumulată',
      fields: ['in_utilizare', 'in_constructie', 'in_planificare'],
      style: { titleSize: 22, titleColor: '#11213b', showTooltip: true },
    },
    {
      id: 'cmp-table',
      type: 'summary_table',
      slot: 'bottom_right',
      title: 'Tabel sumar',
      subtitle: 'Top rute pentru selecția curentă.',
      limit: 20,
      style: { titleSize: 22, titleColor: '#11213b', subtitleSize: 14, subtitleColor: '#6e8098' },
    },
    {
      id: 'cmp-bar',
      type: 'bar_compare',
      slot: 'bottom',
      title: 'Evoluție comparativă',
      subtitle: 'Comparație între km și stări pentru filtrarea curentă.',
      fields: ['in_constructie', 'in_utilizare', 'in_planificare'],
      style: { titleSize: 22, titleColor: '#11213b', subtitleSize: 14, subtitleColor: '#6e8098', showTooltip: true },
    },
  ];
}

export function createProject(sourceName: string, sourceRows: Record<string, unknown>[]): ProjectConfig {
  const sourceHeaders = Object.keys(sourceRows[0] ?? {});
  const mapping = detectMapping(sourceHeaders);
  const rows = normalizeRows(sourceRows, mapping);
  const years = [...new Set(rows.map((row) => Number(row.an)).filter((value) => Number.isFinite(value)))].sort(
    (a, b) => a - b,
  );
  return {
    projectName: 'KPI Studio Local',
    dataset: {
      sourceName,
      columns: columnsFromRows(rows),
      rows,
      sourceHeaders,
      sourcePreview: sourceRows.slice(0, 5),
    },
    mapping,
    metrics: defaultMetrics(),
    components: defaultComponents(),
    theme: {
      pageBg: '#eef2f7',
      canvasBg: '#ffffff',
      accent: '#2464bf',
      fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
      canvasWidth: 1600,
      minWidth: 1260,
      minHeight: 860,
      padding: 22,
    },
    selectedYear: years[years.length - 1] || new Date().getFullYear(),
    filterValues: { an: FILTER_ALL, cod_ruta: FILTER_ALL, nume_ruta: FILTER_ALL, status: FILTER_ALL, judet: FILTER_ALL },
    statusColors: {
      in_utilizare: '#1f8f54',
      in_constructie: '#df8b22',
      in_planificare: '#2464bf',
    },
    statusLabels: {
      in_utilizare: 'În utilizare',
      in_constructie: 'În construcție',
      in_planificare: 'În planificare',
    },
  };
}
