import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
  ComposedChart,
  Cell,
} from 'recharts';
import './DashboardAnalytics.css';

const PALETTE = ['#c41e3a', '#8b1538', '#e85d75', '#dc2626', '#64748b', '#0ea5e9', '#f59e0b', '#10b981', '#8b5cf6'];

const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('es-CO') : n);

const TooltipContent = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="dashboard-recharts-tooltip">
      <div className="dashboard-recharts-tooltip__label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="dashboard-recharts-tooltip__row">
          <span style={{ color: p.color }}>{p.name}</span>
          <strong>{fmt(p.value)}</strong>
        </div>
      ))}
    </div>
  );
};

/** Convierte { label, value } o { name, value } a { name, value } */
function toNameValue(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => ({
    name: x.name != null ? x.name : x.label,
    value: Number(x.value) || 0,
  }));
}

function MonthlyComposed({ data, loading, title }) {
  const chartData = toNameValue(data?.applicationsByMonth || []).map((d) => ({
    name: d.name,
    aplicaciones: d.value,
  }));

  if (loading) {
    return (
      <div className="dashboard-chart-card">
        <h3 className="dashboard-chart-card__title">{title}</h3>
        <div className="dashboard-chart-card__skeleton" style={{ height: 320 }} />
      </div>
    );
  }

  return (
    <div className="dashboard-chart-card">
      <h3 className="dashboard-chart-card__title">{title}</h3>
      <p className="dashboard-chart-card__hint">Agrupado por fecha de aplicación de la postulación</p>
      <div className="dashboard-chart-card__plot" style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#64748b" />
            <YAxis tick={{ fontSize: 12 }} stroke="#64748b" tickFormatter={fmt} />
            <Tooltip content={<TooltipContent />} />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            <Bar dataKey="aplicaciones" name="Postulaciones" fill="#c41e3a" radius={[6, 6, 0, 0]} maxBarSize={48} />
            <Line
              type="monotone"
              dataKey="aplicaciones"
              name="Tendencia"
              stroke="#8b1538"
              strokeWidth={2}
              dot={{ r: 4, fill: '#8b1538' }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function HorizontalBars({ title, subtitle, rows, loading }) {
  const data = toNameValue(rows).filter((d) => d.name && d.name !== 'Sin datos');
  const showEmpty = !loading && (!data.length || data.every((d) => d.value === 0));

  if (loading) {
    return (
      <div className="dashboard-chart-card dashboard-chart-card--compact">
        <h3 className="dashboard-chart-card__title">{title}</h3>
        <div className="dashboard-chart-card__skeleton" style={{ height: 260 }} />
      </div>
    );
  }

  if (showEmpty) {
    return (
      <div className="dashboard-chart-card dashboard-chart-card--compact">
        <h3 className="dashboard-chart-card__title">{title}</h3>
        {subtitle && <p className="dashboard-chart-card__hint">{subtitle}</p>}
        <div className="dashboard-chart-card__empty">Sin datos para este periodo</div>
      </div>
    );
  }

  const sorted = [...data].sort((a, b) => b.value - a.value).slice(0, 12);

  return (
    <div className="dashboard-chart-card dashboard-chart-card--compact">
      <h3 className="dashboard-chart-card__title">{title}</h3>
      {subtitle && <p className="dashboard-chart-card__hint">{subtitle}</p>}
      <div className="dashboard-chart-card__plot" style={{ height: Math.max(200, sorted.length * 36) }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={sorted}
            margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" tickFormatter={fmt} stroke="#64748b" />
            <YAxis
              type="category"
              dataKey="name"
              width={148}
              tick={{ fontSize: 11 }}
              stroke="#64748b"
            />
            <Tooltip content={<TooltipContent />} cursor={{ fill: 'rgba(196, 30, 58, 0.06)' }} />
            <Bar dataKey="value" name="Cantidad" radius={[0, 4, 4, 0]}>
              {sorted.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * @param {'practicas'|'monitoria'} tab
 * @param {object} slice — dashboardData.practicas o .monitoria
 */
export default function DashboardAnalytics({
  tab,
  slice,
  loading,
  hasPOS,
  hasEDP,
  hasTEN,
}) {
  const isPractica = tab === 'practicas';
  const labelTipo = isPractica ? 'práctica' : 'monitoría';

  const showMonthly = hasPOS || hasTEN;

  return (
    <div className="dashboard-analytics">
      {showMonthly && (
        <MonthlyComposed
          loading={loading}
          data={slice}
          title={`Actividad mensual — postulaciones (${labelTipo})`}
        />
      )}

      {hasEDP && (
        <div className="dashboard-analytics__grid">
          <HorizontalBars
            title={isPractica ? 'Oportunidades de práctica por estado' : 'Oportunidades MTM por estado'}
            subtitle="Distribución de ofertas en el sistema"
            rows={slice?.oportunidadesPorEstado}
            loading={loading}
          />
          <HorizontalBars
            title="Postulaciones por etapa del proceso"
            subtitle="Estados del flujo (postulación)"
            rows={slice?.postulacionesPorEstado}
            loading={loading}
          />
          <HorizontalBars
            title="Legalizaciones por estado"
            subtitle={isPractica ? 'Expedientes de legalización de práctica' : 'Expedientes de legalización MTM'}
            rows={slice?.legalizacionesPorEstado}
            loading={loading}
          />
        </div>
      )}

    </div>
  );
}
