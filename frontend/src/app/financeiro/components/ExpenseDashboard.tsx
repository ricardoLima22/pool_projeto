"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  ResponsiveContainer,
} from "recharts";
import { MonthlySummary, CategorySummary } from "@/services/financial";

type Props = {
  monthlySummary: MonthlySummary[];
  categorySummary: CategorySummary[];
  totalComissoes?: number;
  loading?: boolean;
};

// ─── Formatadores ─────────────────────────────────────────────────────────────

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);
}

function shortBRL(v: number) {
  return `R$${(v / 1000).toFixed(0)}k`;
}

function formatMonthLabel(yyyymm: string) {
  const [y, m] = yyyymm.split("-");
  const months = [
    "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
    "Jul", "Ago", "Set", "Out", "Nov", "Dez",
  ];
  return `${months[parseInt(m, 10) - 1]}/${y.slice(2)}`;
}

// ─── Estilos reutilizáveis (tokens CSS → inline para recharts) ────────────────

const axisTick = { fill: "hsl(200 10% 50%)", fontSize: 11 };
const tooltipStyle = {
  background: "hsl(0 0% 100%)",
  border: "1px solid hsl(200 20% 90%)",
  borderRadius: 12,
  fontSize: 12,
  color: "hsl(200 50% 10%)",
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
};
const gridStroke = "hsl(200 20% 90%)";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonChart() {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm animate-pulse">
      <div className="h-4 bg-muted rounded w-1/3 mb-4" />
      <div className="h-48 bg-muted rounded-xl" />
    </div>
  );
}

// ─── Empty Chart ──────────────────────────────────────────────────────────────

function EmptyChart() {
  return (
    <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">
      Sem dados no período.
    </div>
  );
}

// ─── Chart Card ───────────────────────────────────────────────────────────────

function ChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="font-semibold text-card-foreground text-sm">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Custom Tooltip for Line/Bar ──────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string; fill?: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipStyle} className="px-3 py-2">
      {label && (
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
      )}
      {payload.map((p, i) => (
        <p
          key={i}
          className="text-sm font-semibold"
          style={{ color: p.color ?? p.fill }}
        >
          {p.name}: {formatBRL(p.value)}
        </p>
      ))}
    </div>
  );
};

// ─── Custom Tooltip for Pie ───────────────────────────────────────────────────

const PieTooltip = ({ active, payload }: {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: { color: string; percent: number };
  }>;
}) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={tooltipStyle} className="px-3 py-2">
      <p className="text-sm font-semibold" style={{ color: d.payload.color }}>
        {d.name}
      </p>
      <p className="text-xs text-muted-foreground">{formatBRL(d.value)}</p>
      <p className="text-xs text-muted-foreground">
        {d.payload.percent?.toFixed(1)}%
      </p>
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export function ExpenseDashboard({
  monthlySummary,
  categorySummary,
  totalComissoes = 0,
  loading,
}: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SkeletonChart />
        <SkeletonChart />
        <SkeletonChart />
      </div>
    );
  }

  // ── Dados do gráfico Pie (categorias + comissões) ─────────────────────────
  const rawPieData = categorySummary.map((c) => ({
    name: c.category_name,
    value: c.total,
    color: c.color,
  }));

  // Inclui comissões na distribuição geral
  if (totalComissoes > 0) {
    rawPieData.push({
      name: "Comissões",
      value: totalComissoes,
      color: "#10b981", // Verde esmeralda
    });
  }

  const totalSaidasMes = rawPieData.reduce((s, c) => s + c.value, 0);
  const pieData = rawPieData.map((d) => ({
    ...d,
    percent: totalSaidasMes > 0 ? (d.value / totalSaidasMes) * 100 : 0,
  }));

  // ── Dados do gráfico Line (evolução 6 meses) ──────────────────────────────
  const lineData = monthlySummary.map((m) => ({
    label: formatMonthLabel(m.month),
    total: m.total,
    Recorrente: m.recorrente,
  }));

  // ── Dados do gráfico Bar (rec × único — 4 meses) ──────────────────────────
  const barData = monthlySummary.slice(-4).map((m) => ({
    label: formatMonthLabel(m.month),
    Recorrente: m.recorrente,
    Único: m.unico,
  }));

  const isEmpty = (arr: unknown[]) => !arr || arr.length === 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* ── Gráfico Pizza — Por Categoria & Comissões ─────────────────── */}
        <ChartCard
          title="Distribuição de Saídas"
          subtitle="Despesas por Categoria + Comissões"
        >
          {isEmpty(pieData) ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {pieData.map((d, i) => (
                    <Cell key={i} fill={d.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12 }}
                  formatter={(value) => (
                    <span className="text-xs text-card-foreground">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* ── Gráfico Linha — Evolução Mensal ───────────────────────────── */}
        <ChartCard title="Evolução de Despesas" subtitle="Últimos 6 meses">
          {isEmpty(lineData) ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={lineData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis
                  dataKey="label"
                  tick={axisTick}
                  stroke={gridStroke}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={shortBRL}
                  tick={axisTick}
                  stroke={gridStroke}
                  axisLine={false}
                  tickLine={false}
                  width={45}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(187 80% 42%)"
                  strokeWidth={2}
                  dot={{ r: 4, fill: "hsl(187 80% 42%)" }}
                  activeDot={{ r: 6 }}
                  name="Total Despesas"
                />
                <Line
                  type="monotone"
                  dataKey="Recorrente"
                  stroke="#a855f7"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  dot={{ r: 3, fill: "#a855f7" }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* ── Gráfico Barras — Recorrente × Único ───────────────────────── */}
        <ChartCard title="Recorrente × Único" subtitle="Últimos 4 meses">
          {isEmpty(barData) ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={axisTick}
                  stroke={gridStroke}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={shortBRL}
                  tick={axisTick}
                  stroke={gridStroke}
                  axisLine={false}
                  tickLine={false}
                  width={45}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: 12 }}
                  formatter={(value) => (
                    <span className="text-xs text-card-foreground">{value}</span>
                  )}
                />
                <Bar dataKey="Recorrente" fill="#a855f7" radius={[6, 6, 0, 0]} maxBarSize={30} />
                <Bar dataKey="Único" fill="#f59e0b" radius={[6, 6, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
  );
}
