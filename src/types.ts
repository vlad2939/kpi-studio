export type ColumnType = 'year' | 'category' | 'number' | 'text';

export type DatasetColumn = {
  name: string;
  label: string;
  type: ColumnType;
};

export type DashboardRow = Record<string, string | number | null>;

export type DataMapping = {
  mode: 'direct' | 'wideStatusByYear';
  routeCodeField?: string;
  routeNameField?: string;
  segmentField?: string;
  lengthField?: string;
  totalLengthField?: string;
  countyField?: string;
  yearPrefix?: string;
};

export type MetricAggregation =
  | 'sum'
  | 'count'
  | 'distinctCount'
  | 'average'
  | 'min'
  | 'max'
  | 'conditionalSum'
  | 'percentOfTotal'
  | 'formula';

export type MetricDefinition = {
  id: string;
  label: string;
  aggregation: MetricAggregation;
  color?: string;
  field?: string;
  distinctField?: string;
  conditionField?: string;
  conditionValue?: string;
  numeratorMetric?: string;
  denominatorMetric?: string;
  expression?: string;
  suffix?: string;
};

export type ComponentType =
  | 'selective_filter'
  | 'year_slider'
  | 'kpi'
  | 'progress_status'
  | 'donut_status'
  | 'line_trend'
  | 'bar_compare'
  | 'stacked_status'
  | 'summary_table'
  | 'note_block';

export type DashboardSlot =
  | 'filter'
  | 'upper_left'
  | 'upper_center'
  | 'upper_right'
  | 'main_left'
  | 'main_right'
  | 'bottom_left'
  | 'bottom_right'
  | 'bottom'
  | 'lower_left'
  | 'lower_center'
  | 'lower_right';

export type DashboardComponent = {
  id: string;
  type: ComponentType;
  slot: DashboardSlot;
  title: string;
  subtitle?: string;
  fields?: string[];
  metric?: string;
  limit?: number;
  body?: string;
  style?: Record<string, string | number | boolean>;
};

export type ThemeConfig = {
  pageBg: string;
  canvasBg: string;
  accent: string;
  fontFamily: string;
  canvasWidth: number;
  minWidth: number;
  minHeight: number;
  padding: number;
};

export type ProjectConfig = {
  projectName: string;
  dataset: {
    sourceName: string;
    columns: DatasetColumn[];
    rows: DashboardRow[];
    sourceHeaders: string[];
    sourcePreview: Record<string, unknown>[];
  };
  mapping: DataMapping;
  metrics: MetricDefinition[];
  components: DashboardComponent[];
  theme: ThemeConfig;
  selectedYear: number;
  filterValues: Record<string, string>;
  statusColors: Record<string, string>;
  statusLabels: Record<string, string>;
};

export type ExportPayload = Pick<
  ProjectConfig,
  | 'projectName'
  | 'dataset'
  | 'metrics'
  | 'components'
  | 'theme'
  | 'selectedYear'
  | 'filterValues'
  | 'statusColors'
  | 'statusLabels'
>;
