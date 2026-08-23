"use client";

import {
  TrendingUp,
  RefreshCw,
  ArrowDownRight,
  DollarSign,
  Wallet,
} from "lucide-react";

type Props = {
  totalMes: number;
  totalRecorrente: number;
  totalUnico: number;
  mesAnterior: number;
  totalComissoes?: number;
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

// ─── KPI Card ─────────────────────────────────────────────────────────────────

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
  totalComissoes = 0,
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

  const totalGeral = totalMes + totalComissoes;
  const variacao =
    mesAnterior > 0 ? ((totalMes - mesAnterior) / mesAnterior) * 100 : null;
  const subiu = (variacao ?? 0) > 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Geral de Saídas (Despesas + Comissões) */}
      <KpiCard
        icon={<DollarSign className="h-4 w-4 text-primary" />}
        label="Total de Saídas"
        value={formatBRL(totalGeral)}
        hint={
          totalComissoes > 0
            ? "Despesas + Comissões"
            : mesAnterior === 0
            ? "Primeiro mês registrado"
            : `${subiu ? "+" : ""}${variacao?.toFixed(0)}% vs mês anterior`
        }
        hintClass={
          totalComissoes > 0
            ? "text-primary font-medium"
            : mesAnterior === 0
            ? "text-success"
            : subiu
            ? "text-warning"
            : "text-success"
        }
      />

      {/* 2. Total de Comissões dos Funcionários */}
      <KpiCard
        icon={<Wallet className="h-4 w-4 text-emerald-600" />}
        label="Comissões a Pagar"
        value={formatBRL(totalComissoes)}
        hint="Cálculo mensal automático dos funcionários"
        hintClass="text-emerald-600 font-medium"
      />

      {/* 3. Despesas Lançadas */}
      <KpiCard
        icon={<ArrowDownRight className="h-4 w-4 text-warning" />}
        label="Despesas Lançadas"
        value={formatBRL(totalMes)}
        hint={`${
          totalGeral > 0 ? Math.round((totalMes / totalGeral) * 100) : 0
        }% do total de saídas`}
      />

      {/* 4. Gastos Recorrentes */}
      <KpiCard
        icon={<RefreshCw className="h-4 w-4 text-primary" />}
        label="Gastos Recorrentes"
        value={formatBRL(totalRecorrente)}
        hint={`${
          totalMes > 0
            ? Math.round((totalRecorrente / totalMes) * 100)
            : 0
        }% das despesas`}
      />
    </div>
  );
}
