"use client";

import { useState, useEffect } from "react";
import { Check, Plus, RefreshCw } from "lucide-react";
import {
  ExpenseCategory,
  Expense,
  ExpenseCreate,
  ExpenseUpdate,
} from "@/services/financial";

// ─── Seta do select (SVG inline — mesmo padrão do clientes/novo) ─────────────
const SELECT_ARROW = `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E")`;

const SELECT_STYLE: React.CSSProperties = {
  backgroundImage: SELECT_ARROW,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 0.5rem center",
  backgroundSize: "0.65em auto",
};

type Props = {
  categories: ExpenseCategory[];
  companyId: string;
  userId: string;
  editing?: Expense | null;
  onSubmit: (data: ExpenseCreate | ExpenseUpdate) => Promise<void>;
  onCancel?: () => void;
};

// ─── Classes compartilhadas (tokens do clientes/novo) ─────────────────────────

const LABEL_CLASS =
  "text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1";

const INPUT_CLASS =
  "w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#008080] focus:outline-none transition-colors text-sm rounded-none appearance-none";

const SELECT_CLASS =
  "w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 focus:border-[#008080] focus:outline-none transition-colors text-sm appearance-none";

// ─── Expense Form ─────────────────────────────────────────────────────────────

export function ExpenseForm({
  categories,
  companyId,
  userId,
  editing,
  onSubmit,
  onCancel,
}: Props) {
  const today = new Date().toISOString().split("T")[0];

  const [description, setDescription] = useState("");
  const [value, setValue] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [expenseDate, setExpenseDate] = useState(today);
  const [recurrence, setRecurrence] = useState<"unico" | "mensal">("unico");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Preenche ao editar ────────────────────────────────────────────────────
  useEffect(() => {
    if (editing) {
      setDescription(editing.description);
      setValue(String(editing.value));
      setCategoryId(editing.category_id ?? "");
      setExpenseDate(editing.expense_date);
      setRecurrence(editing.recurrence);
      setNotes(editing.notes ?? "");
    } else {
      setDescription("");
      setValue("");
      setCategoryId("");
      setExpenseDate(today);
      setRecurrence("unico");
      setNotes("");
    }
    setError("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  // ── Submissão ─────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!description.trim()) return setError("Informe a descrição.");
    const numericValue = Number(value.replace(",", "."));
    if (!value || isNaN(numericValue) || numericValue <= 0)
      return setError("Informe um valor válido.");

    setLoading(true);
    try {
      const payload = {
        description: description.trim().slice(0, 120),
        value: numericValue,
        category_id: categoryId.trim() ? categoryId : null,
        expense_date: expenseDate,
        recurrence,
        notes: notes.trim() || null,
        company_id: companyId,
        created_by: userId,
      };
      await onSubmit(payload);
      if (!editing) {
        setDescription("");
        setValue("");
        setCategoryId("");
        setExpenseDate(today);
        setRecurrence("unico");
        setNotes("");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Cabeçalho do card */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-100">
        <h2 className="text-lg font-bold text-slate-800">
          {editing ? "Editar Gasto" : "Novo Gasto"}
        </h2>
        {editing && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors"
          >
            Cancelar
          </button>
        )}
      </div>

      {/* Formulário */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="px-4 pt-2 pb-6 space-y-1"
      >
        {/* Descrição */}
        <div className="pt-4">
          <label className={LABEL_CLASS}>
            Descrição <span className="text-red-400" aria-hidden>*</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={120}
            placeholder="Ex: Cloro granulado 10kg"
            aria-required="true"
            className={INPUT_CLASS}
          />
        </div>

        {/* Valor */}
        <div className="pt-4">
          <label className={LABEL_CLASS}>
            Valor (R$) <span className="text-red-400" aria-hidden>*</span>
          </label>
          <div className="relative">
            <span className="absolute left-0 top-1/2 -translate-y-1/2 text-sm text-slate-400 select-none pointer-events-none">
              R$
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={value}
              onChange={(e) =>
                setValue(e.target.value.replace(/[^0-9.,]/g, ""))
              }
              placeholder="0,00"
              aria-required="true"
              className={`${INPUT_CLASS} pl-7`}
            />
          </div>
        </div>

        {/* Categoria */}
        <div className="pt-4">
          <label className={LABEL_CLASS}>Categoria</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className={SELECT_CLASS}
            style={SELECT_STYLE}
          >
            <option value="">Sem categoria</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Data */}
        <div className="pt-4">
          <label className={LABEL_CLASS}>Data</label>
          <input
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        {/* Recorrência — toggle segmentado */}
        <div className="pt-4">
          <label className={LABEL_CLASS}>Recorrência</label>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              type="button"
              onClick={() => setRecurrence("unico")}
              className={`py-2.5 rounded-lg text-xs font-semibold transition-all border ${
                recurrence === "unico"
                  ? "bg-[#008080] text-white border-[#008080] shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              Único
            </button>
            <button
              type="button"
              onClick={() => setRecurrence("mensal")}
              className={`py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border ${
                recurrence === "mensal"
                  ? "bg-[#008080] text-white border-[#008080] shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              <RefreshCw className="h-3 w-3" />
              Mensal
            </button>
          </div>
        </div>

        {/* Notas */}
        <div className="pt-4">
          <label className={LABEL_CLASS}>Notas (opcional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="Observações adicionais..."
            className={`${INPUT_CLASS} resize-none`}
          />
        </div>

        {/* Erro */}
        {error && (
          <p
            role="alert"
            className="text-xs text-red-500 pt-2"
          >
            {error}
          </p>
        )}

        {/* Botão submit */}
        <div className="pt-8">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2ECC71] hover:bg-[#27ae60] text-white py-3.5 rounded-xl font-bold text-sm tracking-wide shadow-sm active:scale-95 transition-all text-center disabled:opacity-60"
          >
            {loading ? (
              "SALVANDO..."
            ) : editing ? (
              <span className="flex items-center justify-center gap-2">
                <Check className="h-4 w-4" />
                SALVAR ALTERAÇÕES
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Plus className="h-4 w-4" />
                ADICIONAR GASTO
              </span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
