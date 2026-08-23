"use client";

import {
  TrendingUp,
  RefreshCw,
  ArrowDownRight,
  DollarSign,
} from "lucide-react";

type Props = {
  totalMes: number;
  totalRecorrente: number;
  totalUnico: number;
  mesAnterior: number;
  loading?: boolean;
};

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm animate-pulse">
      <div className="flex items-start justify-between mb-3">
        <div className="h-4 bg-muted rounded w-1/2" />
        <div className="bg-muted rounded-lg w-8 h-8" />
      </div>
      <div className="h-7 bg-muted rounded w-3/4" />
      <div className="h-3 bg-muted rounded w-1/3 mt-2" />
    </div>
  );
}

// ─── KPI Card (replica fiel do Lovable) ──────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  hint,
  hintClass = "text-muted-foreground",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  hintClass?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <div className="bg-primary/10 rounded-lg p-2">{icon}</div>
      </div>
      <p className="text-2xl font-bold text-card-foreground">{value}</p>
      <p className={`text-xs mt-1 ${hintClass}`}>{hint}</p>
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export function ExpenseSummaryCards({
  totalMes,
  totalRecorrente,
  totalUnico,
  mesAnterior,
  loading,
}: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  const variacao =
    mesAnterior > 0 ? ((totalMes - mesAnterior) / mesAnterior) * 100 : null;
  const subiu = (variacao ?? 0) > 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total do Mês */}
      <KpiCard
        icon={<DollarSign className="h-4 w-4 text-primary" />}
        label="Total do Mês"
        value={formatBRL(totalMes)}
        hint={
          mesAnterior === 0
            ? "Primeiro mês registrado"
            : `${subiu ? "+" : ""}${variacao?.toFixed(0)}% vs mês anterior`
        }
        hintClass={
          mesAnterior === 0
            ? "text-success"
            : subiu
            ? "text-warning"
            : "text-success"
        }
      />

      {/* Gastos Recorrentes */}
      <KpiCard
        icon={<RefreshCw className="h-4 w-4 text-primary" />}
        label="Gastos Recorrentes"
        value={formatBRL(totalRecorrente)}
        hint={`${
          totalMes > 0
            ? Math.round((totalRecorrente / totalMes) * 100)
            : 0
        }% do total`}
      />

      {/* Gastos Únicos */}
      <KpiCard
        icon={<ArrowDownRight className="h-4 w-4 text-warning" />}
        label="Gastos Únicos"
        value={formatBRL(totalUnico)}
        hint={`${
          totalMes > 0 ? Math.round((totalUnico / totalMes) * 100) : 0
        }% do total`}
      />

      {/* Mês Anterior */}
      <KpiCard
        icon={<TrendingUp className="h-4 w-4 text-accent" />}
        label="Mês Anterior"
        value={formatBRL(mesAnterior)}
        hint="Referência de comparação"
      />
    </div>
  );
}
