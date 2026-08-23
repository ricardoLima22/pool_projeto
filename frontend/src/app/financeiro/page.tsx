"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  getExpenseCategories,
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getMonthlyTotals,
  getCategoryTotals,
  getTotalCommissions,
  ExpenseCategory,
  Expense,
  ExpenseCreate,
  ExpenseUpdate,
  MonthlySummary,
  CategorySummary,
} from "@/services/financial";
import { ExpenseSummaryCards } from "./components/ExpenseSummaryCards";
import { ExpenseForm } from "./components/ExpenseForm";
import { ExpenseTable } from "./components/ExpenseTable";
import { ExpenseDashboard } from "./components/ExpenseDashboard";
import { Settings, BarChart3, List, X, Plus, Trash2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

// ─── Color palette ────────────────────────────────────────────────────────────

const PALETTE = [
  "#3b82f6", // azul
  "#22d3ee", // ciano
  "#a855f7", // roxo
  "#f59e0b", // âmbar
  "#10b981", // verde
  "#ef4444", // vermelho
  "#f97316", // laranja
  "#6b7280", // cinza
];

// ─── Categories Modal ─────────────────────────────────────────────────────────

function CategoriesModal({
  categories,
  companyId,
  onCreated,
  onDeleted,
  onClose,
}: {
  categories: ExpenseCategory[];
  companyId: string;
  onCreated: (cat: ExpenseCategory) => void;
  onDeleted: (id: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PALETTE[0]);
  const [loading, setLoading] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleCreate = async () => {
    if (!name.trim()) return toast.error("Informe o nome da categoria.");
    setLoading(true);
    try {
      const { createExpenseCategory } = await import("@/services/financial");
      const cat = await createExpenseCategory({
        name: name.trim().slice(0, 40),
        color: selectedColor,
        icon: "tag",
        company_id: companyId,
      });
      onCreated(cat);
      setName("");
      // Avança para a próxima cor automaticamente
      setSelectedColor(PALETTE[(categories.length + 1) % PALETTE.length]);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao criar categoria.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { deleteExpenseCategory } = await import("@/services/financial");
      await deleteExpenseCategory(id);
      onDeleted(id);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao remover categoria.");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-foreground/60 backdrop-blur-sm flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-md p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="categories-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2
            id="categories-modal-title"
            className="font-bold text-card-foreground"
          >
            Categorias
          </h2>
          <button
            onClick={onClose}
            aria-label="Fechar modal de categorias"
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Formulário nova categoria */}
        <div className="mb-5">
          {/* Preview + input + botão adicionar */}
          <div className="flex gap-2 mb-3">
            {/* Bolinha preview da cor selecionada */}
            <span
              className="h-10 w-10 rounded-full shrink-0 border-2 border-border self-center"
              style={{ backgroundColor: selectedColor }}
              aria-hidden
            />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              maxLength={40}
              placeholder="Nova categoria"
              aria-label="Nome da nova categoria"
              className="input-base"
            />
            <button
              onClick={handleCreate}
              disabled={loading || !name.trim()}
              aria-label="Adicionar categoria"
              className="bg-primary text-primary-foreground rounded-xl px-4 font-semibold shrink-0 disabled:opacity-50 transition-opacity hover:opacity-90"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Paleta de cores */}
          <div className="flex items-center gap-2 flex-wrap pl-12">
            {PALETTE.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => setSelectedColor(color)}
                aria-label={`Selecionar cor ${color}`}
                title={color}
                className="transition-transform focus:outline-none"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  backgroundColor: color,
                  border: selectedColor === color
                    ? "2px solid white"
                    : "2px solid transparent",
                  boxShadow: selectedColor === color
                    ? `0 0 0 2px ${color}`
                    : "none",
                  transform: selectedColor === color ? "scale(1.2)" : "scale(1)",
                }}
              />
            ))}
          </div>
        </div>

        {/* Lista de categorias */}
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhuma categoria.
            </p>
          ) : (
            categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center gap-2 bg-muted/50 rounded-xl px-3 py-2"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: cat.color }}
                />
                <span className="flex-1 text-sm text-card-foreground">
                  {cat.name}
                </span>
                <button
                  onClick={() => handleDelete(cat.id)}
                  aria-label={`Remover categoria ${cat.name}`}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tab Button ───────────────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 pb-3 -mb-px text-sm font-semibold border-b-2 transition-colors ${active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-foreground"
        }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FinanceiroPage() {
  const now = new Date();
  const [companyId, setCompanyId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");

  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary[]>([]);
  const [categorySummary, setCategorySummary] = useState<CategorySummary[]>([]);
  const [totalComissoes, setTotalComissoes] = useState(0);

  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1);
  const [filterYear, setFilterYear] = useState(now.getFullYear());
  const [filterCategory, setFilterCategory] = useState("");

  const [editing, setEditing] = useState<Expense | null>(null);
  const [showCategories, setShowCategories] = useState(false);
  const [activeTab, setActiveTab] = useState<"lancamentos" | "dashboard">(
    "lancamentos"
  );
  const [loadingData, setLoadingData] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [sessionLoaded, setSessionLoaded] = useState(false);

  const router = useRouter();

  // ── Auth: carrega usuário e empresa ──────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
        return;
      }
      const uid = session.user.id;
      setUserId(uid);

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", uid)
        .single();

      if (profile?.company_id) {
        setCompanyId(profile.company_id);
      } else {
        setLoadingData(false);
        setLoadingCharts(false);
      }
      setSessionLoaded(true);
    });
  }, [router]);

  // ── Carrega gastos, categorias e total de comissões ────────────────────────
  const loadExpenses = useCallback(async () => {
    if (!companyId) {
      setLoadingData(false);
      return;
    }
    setLoadingData(true);
    try {
      const [cats, exps, comissoes] = await Promise.all([
        getExpenseCategories(companyId),
        getExpenses(companyId, {
          month: filterMonth,
          year: filterYear,
          categoryId: filterCategory || undefined,
        }),
        getTotalCommissions(companyId),
      ]);
      setCategories(cats);
      setExpenses(exps);
      setTotalComissoes(comissoes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingData(false);
    }
  }, [companyId, filterMonth, filterYear, filterCategory]);

  // ── Carrega dados dos gráficos ────────────────────────────────────────────
  const loadCharts = useCallback(async () => {
    if (!companyId) {
      setLoadingCharts(false);
      return;
    }
    setLoadingCharts(true);
    try {
      const [monthly, catTotals] = await Promise.all([
        getMonthlyTotals(companyId, 6),
        getCategoryTotals(companyId, filterMonth, filterYear),
      ]);
      setMonthlySummary(monthly);
      setCategorySummary(catTotals);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCharts(false);
    }
  }, [companyId, filterMonth, filterYear]);

  useEffect(() => {
    if (!sessionLoaded) return;
    loadExpenses();
    loadCharts();
  }, [sessionLoaded, loadExpenses, loadCharts]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalMes = expenses.reduce((s, e) => s + Number(e.value), 0);
  const totalRecorrente = expenses
    .filter((e) => e.recurrence === "mensal")
    .reduce((s, e) => s + Number(e.value), 0);
  const totalUnico = expenses
    .filter((e) => e.recurrence === "unico")
    .reduce((s, e) => s + Number(e.value), 0);

  const prevMonthKey =
    filterMonth === 1
      ? `${filterYear - 1}-12`
      : `${filterYear}-${String(filterMonth - 1).padStart(2, "0")}`;
  const mesAnterior =
    monthlySummary.find((m) => m.month === prevMonthKey)?.total ?? 0;

  // ── Handlers CRUD ─────────────────────────────────────────────────────────
  const handleCreate = async (data: ExpenseCreate | ExpenseUpdate) => {
    const newExp = await createExpense(data as ExpenseCreate);
    setExpenses((prev) => [newExp, ...prev]);
    loadCharts();
  };

  const handleUpdate = async (data: ExpenseCreate | ExpenseUpdate) => {
    if (!editing) return;
    const updated = await updateExpense(editing.id, data as ExpenseUpdate);
    setExpenses((prev) =>
      prev.map((e) => (e.id === updated.id ? updated : e))
    );
    setEditing(null);
    loadCharts();
  };

  const handleDelete = async (id: string) => {
    await deleteExpense(id);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    loadCharts();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Header fixo — padrão Clientes ──────────────────────────────── */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 30,
          // iOS Safari fix: força GPU layer para evitar jitter no scroll
          WebkitTransform: "translateZ(0)",
          transform: "translateZ(0)",
          WebkitBackfaceVisibility: "hidden",
          backfaceVisibility: "hidden",
          // Garante que o header não some com o scroll do iOS
          WebkitOverflowScrolling: "auto",
        }}
        className="px-4 py-4 pt-6 flex items-center justify-between bg-white border-b border-slate-200"
      >
        {/* Esquerda: voltar + título */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/home")}
            className="text-slate-800 transition-colors"
            aria-label="Voltar para a home"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold text-slate-800">Financeiro</h1>
        </div>

        {/* Direita: botão Categorias */}
        <button
          onClick={() => setShowCategories(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
          style={{ background: "#3b82f6" }}
          aria-label="Abrir gerenciador de categorias"
        >
          <Settings className="h-3.5 w-3.5" />
          Categorias
        </button>
      </header>

      {/* ── Conteúdo — empurrado pelo header fixo ─────────────────────── */}
      <div className="min-h-screen bg-[#fcfbf8]" style={{ paddingTop: 72 }}>
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-12">
          {/* KPI Cards */}
          <div style={{ animation: "slide-up 0.6s ease-out forwards" }}>
            <ExpenseSummaryCards
              totalMes={totalMes}
              totalComissoes={totalComissoes}
              totalRecorrente={totalRecorrente}
              totalUnico={totalUnico}
              mesAnterior={mesAnterior}
              loading={loadingData}
            />
          </div>

          {/* Tabs */}
          <div className="mt-8 border-b border-border flex gap-6">
            <TabButton
              active={activeTab === "lancamentos"}
              onClick={() => setActiveTab("lancamentos")}
              icon={<List className="h-4 w-4" />}
              label="Lançamentos"
            />
            <TabButton
              active={activeTab === "dashboard"}
              onClick={() => setActiveTab("dashboard")}
              icon={<BarChart3 className="h-4 w-4" />}
              label="Dashboard"
            />
          </div>

          {/* Tab Content */}
          {activeTab === "lancamentos" ? (
            <div
              className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5 mt-6"
              style={{ animation: "slide-up 0.6s ease-out forwards" }}
            >
              {/* Formulário */}
              <div>
                <ExpenseForm
                  categories={categories}
                  companyId={companyId}
                  userId={userId}
                  editing={editing}
                  onSubmit={editing ? handleUpdate : handleCreate}
                  onCancel={() => setEditing(null)}
                />
              </div>

              {/* Tabela */}
              <ExpenseTable
                expenses={expenses}
                categories={categories}
                loading={loadingData}
                onEdit={(exp) => {
                  setEditing(exp);
                  setActiveTab("lancamentos");
                }}
                onDelete={handleDelete}
                filterMonth={filterMonth}
                filterYear={filterYear}
                filterCategory={filterCategory}
                onFilterMonth={setFilterMonth}
                onFilterYear={setFilterYear}
                onFilterCategory={setFilterCategory}
              />
            </div>
          ) : (
            <div
              className="mt-6"
              style={{ animation: "slide-up 0.6s ease-out forwards" }}
            >
              <ExpenseDashboard
                monthlySummary={monthlySummary}
                categorySummary={categorySummary}
                totalComissoes={totalComissoes}
                loading={loadingCharts}
              />
            </div>
          )}
        </main>
      </div>

      {/* ── Categories Modal ────────────────────────────────────────────── */}
      {showCategories && (
        <CategoriesModal
          categories={categories}
          companyId={companyId}
          onCreated={(cat) => setCategories((prev) => [...prev, cat])}
          onDeleted={(id) =>
            setCategories((prev) => prev.filter((c) => c.id !== id))
          }
          onClose={() => setShowCategories(false)}
        />
      )}
    </>
  );
}
