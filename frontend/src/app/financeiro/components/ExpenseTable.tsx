"use client";

import { useState } from "react";
import { Pencil, Trash2, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Expense, ExpenseCategory } from "@/services/financial";

type Props = {
  expenses: Expense[];
  categories: ExpenseCategory[];
  loading?: boolean;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
  filterMonth: number;
  filterYear: number;
  filterCategory: string;
  onFilterMonth: (v: number) => void;
  onFilterYear: (v: number) => void;
  onFilterCategory: (v: string) => void;
};

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-border animate-pulse">
      {[...Array(6)].map((_, j) => (
        <td key={j} className="px-4 py-3">
          <div className="h-4 bg-muted rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

// ─── Sort icon ────────────────────────────────────────────────────────────────

function SortIcon({
  field,
  sortField,
  sortAsc,
}: {
  field: string;
  sortField: string;
  sortAsc: boolean;
}) {
  if (sortField !== field) return null;
  return sortAsc ? (
    <ChevronUp className="w-3.5 h-3.5 inline ml-1" />
  ) : (
    <ChevronDown className="w-3.5 h-3.5 inline ml-1" />
  );
}

// ─── Expense Table ────────────────────────────────────────────────────────────

export function ExpenseTable({
  expenses,
  categories,
  loading,
  onEdit,
  onDelete,
  filterMonth,
  filterYear,
  filterCategory,
  onFilterMonth,
  onFilterYear,
  onFilterCategory,
}: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<"expense_date" | "value">(
    "expense_date"
  );
  const [sortAsc, setSortAsc] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1];

  const sorted = [...expenses].sort((a, b) => {
    const va = sortField === "value" ? a.value : a.expense_date;
    const vb = sortField === "value" ? b.value : b.expense_date;
    return sortAsc ? (va > vb ? 1 : -1) : va < vb ? 1 : -1;
  });

  const handleSort = (field: "expense_date" | "value") => {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await onDelete(id);
    setDeletingId(null);
  };

  return (
    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col">
      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap p-4 border-b border-border">
        <select
          value={filterMonth}
          onChange={(e) => onFilterMonth(Number(e.target.value))}
          aria-label="Filtrar por mês"
          className="chip-select"
        >
          {MONTHS.map((m, i) => (
            <option key={i} value={i + 1}>
              {m}
            </option>
          ))}
        </select>

        <select
          value={filterYear}
          onChange={(e) => onFilterYear(Number(e.target.value))}
          aria-label="Filtrar por ano"
          className="chip-select"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <select
          value={filterCategory}
          onChange={(e) => onFilterCategory(e.target.value)}
          aria-label="Filtrar por categoria"
          className="chip-select"
        >
          <option value="">Todas as categorias</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
              <th
                className="text-left font-semibold px-4 py-3 cursor-pointer hover:text-foreground transition-colors select-none"
                onClick={() => handleSort("expense_date")}
              >
                Data{" "}
                <SortIcon
                  field="expense_date"
                  sortField={sortField}
                  sortAsc={sortAsc}
                />
              </th>
              <th className="text-left font-semibold px-4 py-3">Descrição</th>
              <th className="text-left font-semibold px-4 py-3">Categoria</th>
              <th className="text-left font-semibold px-4 py-3">Recorrência</th>
              <th
                className="text-right font-semibold px-4 py-3 cursor-pointer hover:text-foreground transition-colors select-none"
                onClick={() => handleSort("value")}
              >
                Valor{" "}
                <SortIcon
                  field="value"
                  sortField={sortField}
                  sortAsc={sortAsc}
                />
              </th>
              <th className="text-right font-semibold px-4 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => <SkeletonRow key={i} />)
            ) : sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="text-center py-12 text-sm text-muted-foreground"
                >
                  Nenhum lançamento neste período.
                </td>
              </tr>
            ) : (
              sorted.map((exp) => {
                const cat = exp.expense_categories;
                return (
                  <tr
                    key={exp.id}
                    className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                  >
                    {/* Data */}
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDate(exp.expense_date)}
                    </td>

                    {/* Descrição + nota */}
                    <td className="px-4 py-3">
                      <p className="font-semibold text-card-foreground">
                        {exp.description}
                      </p>
                      {exp.notes && (
                        <p className="text-xs text-muted-foreground">
                          {exp.notes}
                        </p>
                      )}
                    </td>

                    {/* Categoria badge */}
                    <td className="px-4 py-3">
                      {cat ? (
                        <span
                          className="text-xs font-medium px-2.5 py-1 rounded-full"
                          style={{
                            color: cat.color,
                            backgroundColor: `${cat.color}22`,
                            border: `1px solid ${cat.color}44`,
                          }}
                        >
                          {cat.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>

                    {/* Recorrência badge */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${exp.recurrence === "mensal"
                            ? "border-primary/40 text-primary bg-primary/10"
                            : "border-border text-muted-foreground"
                          }`}
                      >
                        {exp.recurrence === "mensal" && (
                          <RefreshCw className="h-3 w-3" />
                        )}
                        {exp.recurrence === "mensal" ? "Mensal" : "Único"}
                      </span>
                    </td>

                    {/* Valor */}
                    <td className="px-4 py-3 text-right font-bold text-card-foreground whitespace-nowrap">
                      {formatBRL(exp.value)}
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEdit(exp)}
                          aria-label={`Editar gasto ${exp.description}`}
                          className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(exp.id)}
                          disabled={deletingId === exp.id}
                          aria-label={`Excluir gasto ${exp.description}`}
                          className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                        >
                          {deletingId === exp.id ? (
                            <span className="w-4 h-4 border-2 border-destructive/30 border-t-destructive rounded-full animate-spin inline-block" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
