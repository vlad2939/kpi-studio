import { FILTER_ALL } from './data';
import type { DashboardRow, MetricDefinition, ProjectConfig } from './types';

export type Summary = {
  values: Record<string, number>;
  statusSummary: { key: string; name: string; value: number; percent: number; color: string }[];
};

export function fmt(value: number) {
  return new Intl.NumberFormat('ro-RO', { maximumFractionDigits: 2 }).format(Number(value || 0));
}

export function fmtPercent(value: number) {
  return `${Number(value || 0).toFixed(1).replace('.', ',')}%`;
}

export function years(rows: DashboardRow[]) {
  return [...new Set(rows.map((row) => Number(row.an)).filter((value) => Number.isFinite(value)))].sort((a, b) => a - b);
}

export function filterRows(project: ProjectConfig, filterValues = project.filterValues, selectedYear = project.selectedYear) {
  return project.dataset.rows
    .filter((row) => Number(row.an) === Number(selectedYear))
    .filter((row) =>
      Object.entries(filterValues).every(([field, value]) => fieldMatches(row, field, value)),
    );
}

function splitMultiValue(value: unknown) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function fieldMatches(row: DashboardRow, field: string, value: string) {
  if (value === FILTER_ALL) return true;
  if (field === 'judet') return splitMultiValue(row[field]).includes(String(value));
  return String(row[field] ?? '') === String(value);
}

export function uniqueValues(rows: DashboardRow[], field: string) {
  const values =
    field === 'judet'
      ? rows.flatMap((row) => splitMultiValue(row[field]))
      : rows.map((row) => row[field]).filter((value) => value !== null && value !== undefined && value !== '');
  return [...new Set(values)].sort((a, b) => String(a).localeCompare(String(b), 'ro'));
}

function sum(rows: DashboardRow[], field?: string) {
  return rows.reduce((acc, row) => acc + Number(row[field || ''] || 0), 0);
}

function evalFormula(expression: string, values: Record<string, number>) {
  const safe = expression.replace(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g, (token) => String(values[token] ?? 0));
  if (!/^[\d+\-*/().\s]+$/.test(safe)) return 0;
  return Number(Function(`"use strict"; return (${safe})`)()) || 0;
}

export function computeMetrics(rows: DashboardRow[], metrics: MetricDefinition[]): Record<string, number> {
  const values: Record<string, number> = {};
  metrics.forEach((metric) => {
    if (metric.aggregation === 'sum') values[metric.id] = sum(rows, metric.field);
    if (metric.aggregation === 'count') values[metric.id] = rows.length;
    if (metric.aggregation === 'distinctCount') values[metric.id] = new Set(rows.map((row) => row[metric.distinctField || metric.field || ''])).size;
    if (metric.aggregation === 'average') values[metric.id] = rows.length ? sum(rows, metric.field) / rows.length : 0;
    if (metric.aggregation === 'min') values[metric.id] = Math.min(...rows.map((row) => Number(row[metric.field || ''] || 0)));
    if (metric.aggregation === 'max') values[metric.id] = Math.max(...rows.map((row) => Number(row[metric.field || ''] || 0)));
    if (metric.aggregation === 'conditionalSum') {
      values[metric.id] = sum(
        rows.filter((row) => String(row[metric.conditionField || ''] ?? '') === String(metric.conditionValue ?? '')),
        metric.field,
      );
    }
    if (metric.aggregation === 'percentOfTotal') {
      const numerator = values[metric.numeratorMetric || ''] || 0;
      const denominator = values[metric.denominatorMetric || ''] || 0;
      values[metric.id] = denominator ? (numerator / denominator) * 100 : 0;
    }
    if (metric.aggregation === 'formula') values[metric.id] = evalFormula(metric.expression || '0', values);
    if (!Number.isFinite(values[metric.id])) values[metric.id] = 0;
  });
  return values;
}

export function summarize(rows: DashboardRow[], project: ProjectConfig): Summary {
  const values = computeMetrics(rows, project.metrics);
  const keys = ['in_utilizare', 'in_constructie', 'in_planificare'];
  const total = keys.reduce((acc, key) => acc + Number(values[key] || 0), 0);
  const metricById = new Map(project.metrics.map((metric) => [metric.id, metric]));
  return {
    values,
    statusSummary: keys.map((key) => ({
      key,
      name: project.statusLabels[key] || key,
      value: Number(values[key] || 0),
      percent: total ? (Number(values[key] || 0) / total) * 100 : 0,
      color: metricById.get(key)?.color || project.statusColors[key] || '#2464bf',
    })),
  };
}

export function trendRows(project: ProjectConfig, filterValues = project.filterValues) {
  return years(project.dataset.rows).map((year) => {
    const rows = project.dataset.rows
      .filter((row) => Number(row.an) === Number(year))
      .filter((row) =>
        Object.entries(filterValues).every(([field, value]) => field === 'an' || fieldMatches(row, field, value)),
      );
    return { an: year, ...computeMetrics(rows, project.metrics) };
  });
}

export function routeSummary(rows: DashboardRow[], project: ProjectConfig) {
  const groups = new Map<string, DashboardRow[]>();
  rows.forEach((row) => {
    const key = String(row.ruta || row.nume_ruta || row.cod_ruta || 'Nespecificat');
    groups.set(key, [...(groups.get(key) || []), row]);
  });
  return [...groups.entries()]
    .map(([ruta, group]) => ({ ruta, values: computeMetrics(group, project.metrics) }))
    .sort((a, b) => Number(b.values.total_km || 0) - Number(a.values.total_km || 0));
}
