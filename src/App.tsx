import { useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Database,
  Download,
  FileInput,
  FileJson,
  Filter,
  LayoutDashboard,
  Plus,
  Save,
  Settings2,
  Upload,
  X,
} from 'lucide-react';
import {
  createProject,
  defaultComponents,
  FILTER_ALL,
  loadDemoWorkbook,
  parseCsvFile,
  parseWorkbookFile,
} from './data';
import { filterRows, fmt, summarize, uniqueValues } from './analytics';
import { makeStandaloneHtml, renderPreviewMarkup } from './runtime';
import type { ComponentType, DashboardComponent, DashboardSlot, MetricAggregation, MetricDefinition, ProjectConfig } from './types';
import readmeMarkdown from '../README.md?raw';

const slots: DashboardSlot[] = [
  'upper_left',
  'upper_center',
  'upper_right',
  'main_left',
  'main_right',
  'bottom_left',
  'bottom_right',
  'bottom',
  'lower_left',
  'lower_center',
  'lower_right',
];

const componentTypes: { type: ComponentType; label: string }[] = [
  { type: 'kpi', label: 'KPI' },
  { type: 'progress_status', label: 'Progres status' },
  { type: 'donut_status', label: 'Donut' },
  { type: 'line_trend', label: 'Line chart' },
  { type: 'bar_compare', label: 'Bar chart' },
  { type: 'stacked_status', label: 'Stacked bar' },
  { type: 'summary_table', label: 'Tabel' },
  { type: 'note_block', label: 'Text' },
];

const aggregations: MetricAggregation[] = [
  'sum',
  'count',
  'distinctCount',
  'average',
  'min',
  'max',
  'conditionalSum',
  'percentOfTotal',
  'formula',
];

const chartTypes: ComponentType[] = ['donut_status', 'line_trend', 'bar_compare', 'stacked_status'];

function fieldLabel(field: string) {
  const labels: Record<string, string> = {
    an: 'An',
    cod_ruta: 'Cod rută',
    nume_ruta: 'Nume rută',
    status: 'Status',
    judet: 'Județe',
  };
  return labels[field] || field;
}

function styleNumber(component: DashboardComponent, key: string, fallback: number) {
  const value = component.style?.[key];
  return typeof value === 'number' ? value : fallback;
}

function styleString(component: DashboardComponent, key: string, fallback: string) {
  const value = component.style?.[key];
  return typeof value === 'string' ? value : fallback;
}

function styleBoolean(component: DashboardComponent, key: string, fallback: boolean) {
  const value = component.style?.[key];
  return typeof value === 'boolean' ? value : fallback;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function inlineMarkdown(value: string) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

function markdownToHtml(markdown: string) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];
  let listType: 'ul' | 'ol' | null = null;
  let inCode = false;
  let codeLines: string[] = [];

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };

  const openList = (type: 'ul' | 'ol') => {
    if (listType === type) return;
    closeList();
    html.push(`<${type}>`);
    listType = type;
  };

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (inCode) {
        html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
        codeLines = [];
        inCode = false;
      } else {
        closeList();
        inCode = true;
      }
      continue;
    }

    if (inCode) {
      codeLines.push(line);
      continue;
    }

    if (!line.trim()) {
      closeList();
      continue;
    }

    if (line.startsWith('# ')) {
      closeList();
      html.push(`<h1>${inlineMarkdown(line.slice(2))}</h1>`);
      continue;
    }

    if (line.startsWith('## ')) {
      closeList();
      html.push(`<h2>${inlineMarkdown(line.slice(3))}</h2>`);
      continue;
    }

    if (line.startsWith('### ')) {
      closeList();
      html.push(`<h3>${inlineMarkdown(line.slice(4))}</h3>`);
      continue;
    }

    if (line.startsWith('- ')) {
      openList('ul');
      html.push(`<li>${inlineMarkdown(line.slice(2))}</li>`);
      continue;
    }

    const ordered = line.match(/^\d+\.\s+(.*)$/);
    if (ordered) {
      openList('ol');
      html.push(`<li>${inlineMarkdown(ordered[1])}</li>`);
      continue;
    }

    closeList();
    html.push(`<p>${inlineMarkdown(line)}</p>`);
  }

  closeList();
  if (inCode) {
    html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
  }

  return html.join('\n');
}

function download(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function projectFromJson(file: File) {
  return file.text().then((text) => JSON.parse(text) as ProjectConfig);
}

function newComponent(type: ComponentType): DashboardComponent {
  return {
    id: `cmp-${type}-${Date.now()}`,
    type,
    slot: type === 'selective_filter' ? 'filter' : 'bottom',
    title: componentTypes.find((item) => item.type === type)?.label || 'Componentă',
    subtitle: '',
    fields:
      type === 'line_trend' || type === 'bar_compare' || type === 'stacked_status' || type === 'donut_status' || type === 'progress_status'
        ? ['in_utilizare', 'in_constructie', 'in_planificare']
        : undefined,
    metric: type === 'kpi' ? 'total_km' : undefined,
    limit: type === 'summary_table' ? 10 : undefined,
    body: type === 'note_block' ? 'Notă dashboard' : undefined,
  };
}

export function App() {
  const [project, setProject] = useState<ProjectConfig | null>(null);
  const [selectedComponentId, setSelectedComponentId] = useState<string>('cmp-filter');
  const [selectedMetricId, setSelectedMetricId] = useState<string>('total_km');
  const [status, setStatus] = useState('Încarcă tabel_master.xlsx sau folosește demo-ul inclus.');
  const [showDocs, setShowDocs] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const restoreRef = useRef<HTMLInputElement>(null);

  const previewHtml = useMemo(() => (project ? renderPreviewMarkup(project) : ''), [project]);
  const documentationHtml = useMemo(() => markdownToHtml(readmeMarkdown), []);
  const filtered = project ? filterRows(project) : [];
  const summary = project ? summarize(filtered, project) : null;
  const numericColumns = project?.dataset.columns.filter((column) => column.type === 'number') || [];
  const categoricalColumns = project?.dataset.columns.filter((column) => column.type !== 'number') || [];
  const selectedComponent = project?.components.find((component) => component.id === selectedComponentId);
  const selectedMetric = project?.metrics.find((metric) => metric.id === selectedMetricId);

  async function loadSource(file: File) {
    setStatus('Import date în curs...');
    const parsed = file.name.toLowerCase().endsWith('.csv') ? await parseCsvFile(file) : await parseWorkbookFile(file);
    const next = createProject(file.name, parsed.sourceRows);
    setProject(next);
    setSelectedComponentId(next.components[0]?.id || '');
    setSelectedMetricId(next.metrics[0]?.id || '');
    setStatus(`Import reușit: ${next.dataset.rows.length.toLocaleString('ro-RO')} rânduri normalizate.`);
  }

  async function loadDemo() {
    setStatus('Încarc demo-ul tabel_master.xlsx...');
    const parsed = await loadDemoWorkbook();
    const next = createProject('tabel_master.xlsx', parsed.sourceRows);
    setProject(next);
    setSelectedComponentId(next.components[0]?.id || '');
    setSelectedMetricId(next.metrics[0]?.id || '');
    setStatus(`Demo încărcat: ${next.dataset.rows.length.toLocaleString('ro-RO')} rânduri pe ani.`);
  }

  function updateProject(patch: Partial<ProjectConfig>) {
    if (!project) return;
    setProject({ ...project, ...patch });
  }

  function updateComponent(patch: Partial<DashboardComponent>) {
    if (!project || !selectedComponent) return;
    updateProject({
      components: project.components.map((component) => (component.id === selectedComponent.id ? { ...component, ...patch } : component)),
    });
  }

  function updateMetric(patch: Partial<MetricDefinition>) {
    if (!project || !selectedMetric) return;
    updateProject({
      metrics: project.metrics.map((metric) => (metric.id === selectedMetric.id ? { ...metric, ...patch } : metric)),
    });
  }

  function addComponent(type: ComponentType) {
    if (!project) return;
    const component = newComponent(type);
    updateProject({ components: [...project.components, component] });
    setSelectedComponentId(component.id);
  }

  function addMetric() {
    if (!project) return;
    const metric: MetricDefinition = {
      id: `metric_${Date.now()}`,
      label: 'Metrică nouă',
      aggregation: 'sum',
      field: numericColumns[0]?.name || 'km',
      color: '#2464bf',
    };
    updateProject({ metrics: [...project.metrics, metric] });
    setSelectedMetricId(metric.id);
  }

  function exportHtml() {
    if (!project) return;
    download('kpi-dashboard.html', makeStandaloneHtml(project), 'text/html;charset=utf-8');
  }

  function backupJson() {
    if (!project) return;
    download('kpi-studio-project.json', JSON.stringify(project, null, 2), 'application/json;charset=utf-8');
  }

  function updateComponentStyle(key: string, value: string | number | boolean) {
    if (!selectedComponent) return;
    updateComponent({ style: { ...(selectedComponent.style || {}), [key]: value } });
  }

  function updateMetricWithColor(patch: Partial<MetricDefinition>) {
    if (!project || !selectedMetric) return;
    updateMetric(patch);
    if (patch.color && selectedMetric.id in project.statusColors) {
      updateProject({ statusColors: { ...project.statusColors, [selectedMetric.id]: patch.color } });
    }
  }

  return (
    <div className="studio-shell">
      <header className="topbar">
        <div>
          <div className="brand-row">
            <LayoutDashboard size={25} />
            <h1>KPI Studio</h1>
          </div>
          <p>{status}</p>
        </div>
        <div className="toolbar">
          <button className="icon-button" onClick={loadDemo} title="Încarcă tabel_master.xlsx">
            <Database size={18} />
            Demo
          </button>
          <button className="icon-button" onClick={() => importRef.current?.click()} title="Import XLSX sau CSV">
            <FileInput size={18} />
            Import
          </button>
          <button className="icon-button" onClick={backupJson} disabled={!project} title="Backup JSON">
            <Save size={18} />
            JSON
          </button>
          <button className="icon-button" onClick={() => restoreRef.current?.click()} title="Restore JSON">
            <Upload size={18} />
            Restore
          </button>
          <button className="primary-button" onClick={exportHtml} disabled={!project} title="Export HTML standalone">
            <Download size={18} />
            Export HTML
          </button>
          <button className="icon-button" onClick={() => setShowDocs(true)} title="Deschide manualul de utilizare">
            <BookOpen size={18} />
            Documentație
          </button>
          <input
            ref={importRef}
            hidden
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(event) => event.target.files?.[0] && loadSource(event.target.files[0])}
          />
          <input
            ref={restoreRef}
            hidden
            type="file"
            accept=".json"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const restored = await projectFromJson(file);
              setProject(restored);
              setSelectedComponentId(restored.components[0]?.id || '');
              setSelectedMetricId(restored.metrics[0]?.id || '');
              setStatus('Proiect restaurat din JSON.');
            }}
          />
        </div>
      </header>

      {!project ? (
        <main className="empty-state">
          <div>
            <LayoutDashboard size={46} />
            <h2>Builder local pentru dashboarduri interactive</h2>
            <p>Importă un fișier XLSX/CSV, configurează metrici și componente, apoi exportă un HTML unic, offline.</p>
            <button className="primary-button" onClick={loadDemo}>
              <Database size={18} />
              Pornește cu tabel_master.xlsx
            </button>
          </div>
        </main>
      ) : (
        <main className="workspace">
          <aside className="panel">
            <section className="panel-section">
              <h2>
                <Database size={17} />
                Date
              </h2>
              <div className="stat-grid">
                <div>
                  <span>Sursă</span>
                  <strong>{project.dataset.sourceName}</strong>
                </div>
                <div>
                  <span>Rânduri</span>
                  <strong>{project.dataset.rows.length.toLocaleString('ro-RO')}</strong>
                </div>
                <div>
                  <span>Filtrate</span>
                  <strong>{filtered.length.toLocaleString('ro-RO')}</strong>
                </div>
                <div>
                  <span>Total km</span>
                  <strong>{fmt(summary?.values.total_km || 0)}</strong>
                </div>
              </div>
            </section>

            <section className="panel-section">
              <h2>
                <Filter size={17} />
                Filtre preview
              </h2>
              {['an', 'cod_ruta', 'nume_ruta', 'status', 'judet'].map((field) => (
                <label className="control" key={field}>
                  <span>{fieldLabel(field)}</span>
                  <select
                    value={project.filterValues[field] || FILTER_ALL}
                    onChange={(event) =>
                      updateProject({
                        filterValues: { ...project.filterValues, [field]: event.target.value },
                        selectedYear: field === 'an' && event.target.value !== FILTER_ALL ? Number(event.target.value) : project.selectedYear,
                      })
                    }
                  >
                    <option value={FILTER_ALL}>Toate valorile</option>
                    {uniqueValues(project.dataset.rows, field).map((value) => (
                      <option key={String(value)} value={String(value)}>
                        {String(value)}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </section>

            <section className="panel-section">
              <h2>
                <BarChart3 size={17} />
                Metrici
              </h2>
              <div className="item-list">
                {project.metrics.map((metric) => (
                  <button
                    key={metric.id}
                    className={metric.id === selectedMetricId ? 'list-item active' : 'list-item'}
                    onClick={() => setSelectedMetricId(metric.id)}
                  >
                    {metric.label}
                    <small>{metric.aggregation}</small>
                  </button>
                ))}
              </div>
              <button className="ghost-button" onClick={addMetric}>
                <Plus size={16} />
                Adaugă metrică
              </button>
            </section>
          </aside>

          <section className="preview-pane">
            <iframe title="KPI Studio Preview" className="preview-frame" srcDoc={previewHtml} />
          </section>

          <aside className="panel right-panel">
            <section className="panel-section">
              <h2>
                <Settings2 size={17} />
                Proiect
              </h2>
              <label className="control">
                <span>Nume proiect</span>
                <input value={project.projectName} onChange={(event) => updateProject({ projectName: event.target.value })} />
              </label>
              <label className="control">
                <span>Fundal pagină</span>
                <input
                  type="color"
                  value={project.theme.pageBg}
                  onChange={(event) => updateProject({ theme: { ...project.theme, pageBg: event.target.value } })}
                />
              </label>
              <button className="ghost-button" onClick={() => updateProject({ components: defaultComponents() })}>
                Reset preset vizual
              </button>
            </section>

            <section className="panel-section">
              <h2>
                <LayoutDashboard size={17} />
                Componente
              </h2>
              <div className="item-list">
                {project.components.map((component) => (
                  <button
                    key={component.id}
                    className={component.id === selectedComponentId ? 'list-item active' : 'list-item'}
                    onClick={() => setSelectedComponentId(component.id)}
                  >
                    {component.title}
                    <small>{component.type}</small>
                  </button>
                ))}
              </div>
              <div className="button-grid">
                {componentTypes.map((item) => (
                  <button key={item.type} className="ghost-button compact" onClick={() => addComponent(item.type)}>
                    <Plus size={14} />
                    {item.label}
                  </button>
                ))}
              </div>
            </section>

            {selectedComponent && (
              <section className="panel-section">
                <h2>Config componentă</h2>
                <label className="control">
                  <span>Titlu</span>
                  <input value={selectedComponent.title} onChange={(event) => updateComponent({ title: event.target.value })} />
                </label>
                <label className="control">
                  <span>Subtitlu</span>
                  <textarea
                    value={selectedComponent.subtitle || ''}
                    onChange={(event) => updateComponent({ subtitle: event.target.value })}
                  />
                </label>
                <label className="control">
                  <span>Slot layout</span>
                  <select value={selectedComponent.slot} onChange={(event) => updateComponent({ slot: event.target.value as DashboardSlot })}>
                    {slots.map((slot) => (
                      <option key={slot} value={slot}>
                        {slot}
                      </option>
                    ))}
                    <option value="filter">filter</option>
                  </select>
                </label>
                {selectedComponent.type === 'kpi' && (
                  <label className="control">
                    <span>Metrică</span>
                    <select value={selectedComponent.metric} onChange={(event) => updateComponent({ metric: event.target.value })}>
                      {project.metrics.map((metric) => (
                        <option key={metric.id} value={metric.id}>
                          {metric.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {selectedComponent.fields && (
                  <label className="control">
                    <span>Câmpuri/metrici grafice</span>
                    <input
                      value={selectedComponent.fields.join(', ')}
                      onChange={(event) =>
                        updateComponent({ fields: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })
                      }
                    />
                  </label>
                )}
                {selectedComponent.type === 'summary_table' && (
                  <label className="control">
                    <span>Limită rânduri</span>
                    <input
                      type="number"
                      value={selectedComponent.limit || 10}
                      onChange={(event) => updateComponent({ limit: Number(event.target.value) })}
                    />
                  </label>
                )}
                {selectedComponent.type === 'note_block' && (
                  <label className="control">
                    <span>Text</span>
                    <textarea value={selectedComponent.body || ''} onChange={(event) => updateComponent({ body: event.target.value })} />
                  </label>
                )}
                <div className="control-grid two-cols">
                  <label className="control">
                    <span>Dimensiune titlu</span>
                    <input
                      type="number"
                      min="10"
                      max="64"
                      value={styleNumber(selectedComponent, 'titleSize', 22)}
                      onChange={(event) => updateComponentStyle('titleSize', Number(event.target.value))}
                    />
                  </label>
                  <label className="control">
                    <span>Culoare titlu</span>
                    <input
                      type="color"
                      value={styleString(selectedComponent, 'titleColor', '#11213b')}
                      onChange={(event) => updateComponentStyle('titleColor', event.target.value)}
                    />
                  </label>
                  <label className="control">
                    <span>Dimensiune subtitlu</span>
                    <input
                      type="number"
                      min="10"
                      max="36"
                      value={styleNumber(selectedComponent, 'subtitleSize', 14)}
                      onChange={(event) => updateComponentStyle('subtitleSize', Number(event.target.value))}
                    />
                  </label>
                  <label className="control">
                    <span>Culoare subtitlu</span>
                    <input
                      type="color"
                      value={styleString(selectedComponent, 'subtitleColor', '#6e8098')}
                      onChange={(event) => updateComponentStyle('subtitleColor', event.target.value)}
                    />
                  </label>
                  <label className="control">
                    <span>Dimensiune valori</span>
                    <input
                      type="number"
                      min="12"
                      max="72"
                      value={styleNumber(selectedComponent, 'valueSize', selectedComponent.type === 'kpi' ? 42 : 34)}
                      onChange={(event) => updateComponentStyle('valueSize', Number(event.target.value))}
                    />
                  </label>
                  <label className="control">
                    <span>Culoare valori</span>
                    <input
                      type="color"
                      value={styleString(selectedComponent, 'valueColor', '#2464bf')}
                      onChange={(event) => updateComponentStyle('valueColor', event.target.value)}
                    />
                  </label>
                </div>
                {chartTypes.includes(selectedComponent.type) && (
                  <label className="check-control">
                    <input
                      type="checkbox"
                      checked={styleBoolean(selectedComponent, 'showTooltip', true)}
                      onChange={(event) => updateComponentStyle('showTooltip', event.target.checked)}
                    />
                    <span>Afișează tooltip hover cu valorile reprezentate</span>
                  </label>
                )}
              </section>
            )}

            {selectedMetric && (
              <section className="panel-section">
                <h2>Config metrică</h2>
                <label className="control">
                  <span>ID</span>
                  <input value={selectedMetric.id} onChange={(event) => updateMetric({ id: event.target.value })} />
                </label>
                <label className="control">
                  <span>Etichetă</span>
                  <input value={selectedMetric.label} onChange={(event) => updateMetric({ label: event.target.value })} />
                </label>
                <label className="control">
                  <span>Culoare metrică</span>
                  <input
                    type="color"
                    value={selectedMetric.color || '#2464bf'}
                    onChange={(event) => updateMetricWithColor({ color: event.target.value })}
                  />
                </label>
                <label className="control">
                  <span>Agregare</span>
                  <select value={selectedMetric.aggregation} onChange={(event) => updateMetric({ aggregation: event.target.value as MetricAggregation })}>
                    {aggregations.map((aggregation) => (
                      <option key={aggregation} value={aggregation}>
                        {aggregation}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="control">
                  <span>Câmp numeric</span>
                  <select value={selectedMetric.field || ''} onChange={(event) => updateMetric({ field: event.target.value })}>
                    <option value="">Niciun câmp</option>
                    {numericColumns.map((column) => (
                      <option key={column.name} value={column.name}>
                        {column.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="control">
                  <span>Condiție câmp</span>
                  <select value={selectedMetric.conditionField || ''} onChange={(event) => updateMetric({ conditionField: event.target.value })}>
                    <option value="">Fără condiție</option>
                    {categoricalColumns.map((column) => (
                      <option key={column.name} value={column.name}>
                        {column.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="control">
                  <span>Condiție valoare</span>
                  <input value={selectedMetric.conditionValue || ''} onChange={(event) => updateMetric({ conditionValue: event.target.value })} />
                </label>
                <label className="control">
                  <span>Formulă</span>
                  <input value={selectedMetric.expression || ''} onChange={(event) => updateMetric({ expression: event.target.value })} />
                </label>
              </section>
            )}

            <section className="panel-section">
              <h2>
                <FileJson size={17} />
                Coloane
              </h2>
              <div className="schema-list">
                {project.dataset.columns.map((column) => (
                  <span key={column.name}>
                    {column.name}
                    <small>{column.type}</small>
                  </span>
                ))}
              </div>
            </section>
          </aside>
        </main>
      )}

      {showDocs && (
        <div className="docs-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="docs-title">
          <div className="docs-modal">
            <div className="docs-modal-header">
              <div>
                <span>Manual de utilizare</span>
                <h2 id="docs-title">Documentație KPI Studio</h2>
              </div>
              <button className="icon-button docs-close" onClick={() => setShowDocs(false)} title="Închide documentația">
                <X size={18} />
                Închide
              </button>
            </div>
            <div className="docs-content" dangerouslySetInnerHTML={{ __html: documentationHtml }} />
          </div>
        </div>
      )}
    </div>
  );
}
