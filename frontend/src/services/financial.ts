import { supabase } from "@/lib/supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ExpenseCategory = {
  id: string;
  name: string;
  color: string;
  icon: string;
  company_id: string;
  created_at: string;
};

export type Expense = {
  id: string;
  category_id: string | null;
  description: string;
  value: number;
  expense_date: string;
  recurrence: "unico" | "mensal";
  notes: string | null;
  company_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  expense_categories?: ExpenseCategory | null;
};

export type ExpenseCreate = Omit<
  Expense,
  "id" | "created_at" | "updated_at" | "expense_categories"
>;

export type ExpenseUpdate = Partial<
  Omit<Expense, "id" | "created_at" | "updated_at" | "expense_categories">
>;

export type ExpenseCategoryCreate = Omit<
  ExpenseCategory,
  "id" | "created_at"
>;

// ─── Expense Categories ───────────────────────────────────────────────────────

export async function getExpenseCategories(companyId: string) {
  const { data, error } = await supabase
    .from("expense_categories")
    .select("*")
    .eq("company_id", companyId)
    .order("name");

  if (error) throw error;
  return data as ExpenseCategory[];
}

export async function createExpenseCategory(payload: ExpenseCategoryCreate) {
  const { data, error } = await supabase
    .from("expense_categories")
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as ExpenseCategory;
}

export async function deleteExpenseCategory(id: string) {
  const { error } = await supabase
    .from("expense_categories")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export type ExpenseFilters = {
  month?: number; // 1–12
  year?: number;
  categoryId?: string;
  recurrence?: "unico" | "mensal";
};

export async function getExpenses(
  companyId: string,
  filters?: ExpenseFilters
) {
  let query = supabase
    .from("expenses")
    .select("*, expense_categories(id, name, color, icon)")
    .eq("company_id", companyId)
    .order("expense_date", { ascending: false });

  if (filters?.categoryId) {
    query = query.eq("category_id", filters.categoryId);
  }
  if (filters?.recurrence) {
    query = query.eq("recurrence", filters.recurrence);
  }
  if (filters?.month && filters?.year) {
    const from = `${filters.year}-${String(filters.month).padStart(2, "0")}-01`;
    const lastDay = new Date(filters.year, filters.month, 0).getDate();
    const to = `${filters.year}-${String(filters.month).padStart(2, "0")}-${lastDay}`;
    query = query.gte("expense_date", from).lte("expense_date", to);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as Expense[];
}

export async function createExpense(payload: ExpenseCreate) {
  const { data, error } = await supabase
    .from("expenses")
    .insert(payload)
    .select("*, expense_categories(id, name, color, icon)")
    .single();

  if (error) throw error;
  return data as Expense;
}

export async function updateExpense(id: string, payload: ExpenseUpdate) {
  const { data, error } = await supabase
    .from("expenses")
    .update(payload)
    .eq("id", id)
    .select("*, expense_categories(id, name, color, icon)")
    .single();

  if (error) throw error;
  return data as Expense;
}

export async function deleteExpense(id: string) {
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw error;
}

// ─── Summary / Aggregations ───────────────────────────────────────────────────

export type MonthlySummary = {
  month: string; // "YYYY-MM"
  total: number;
  recorrente: number;
  unico: number;
};

export type CategorySummary = {
  category_id: string;
  category_name: string;
  color: string;
  total: number;
};

export async function getMonthlyTotals(
  companyId: string,
  months: number = 6
): Promise<MonthlySummary[]> {
  const from = new Date();
  from.setMonth(from.getMonth() - (months - 1));
  from.setDate(1);
  const fromStr = from.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("expenses")
    .select("expense_date, value, recurrence")
    .eq("company_id", companyId)
    .gte("expense_date", fromStr)
    .order("expense_date");

  if (error) throw error;

  const grouped: Record<string, MonthlySummary> = {};
  for (const row of data ?? []) {
    const month = row.expense_date.slice(0, 7);
    if (!grouped[month]) {
      grouped[month] = { month, total: 0, recorrente: 0, unico: 0 };
    }
    grouped[month].total += Number(row.value);
    if (row.recurrence === "mensal") {
      grouped[month].recorrente += Number(row.value);
    } else {
      grouped[month].unico += Number(row.value);
    }
  }

  return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month));
}

export async function getCategoryTotals(
  companyId: string,
  month: number,
  year: number
): Promise<CategorySummary[]> {
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const to = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

  const { data, error } = await supabase
    .from("expenses")
    .select("value, expense_categories(id, name, color)")
    .eq("company_id", companyId)
    .gte("expense_date", from)
    .lte("expense_date", to);

  if (error) throw error;

  const grouped: Record<string, CategorySummary> = {};
  for (const row of data ?? []) {
    const cat = (row.expense_categories as unknown) as {
      id: string;
      name: string;
      color: string;
    } | null;
    const key = cat?.id ?? "sem-categoria";
    if (!grouped[key]) {
      grouped[key] = {
        category_id: key,
        category_name: cat?.name ?? "Sem Categoria",
        color: cat?.color ?? "#6B7280",
        total: 0,
      };
    }
    grouped[key].total += Number(row.value);
  }

  return Object.values(grouped).sort((a, b) => b.total - a.total);
}

// ─── Commissions (Comissões dos Funcionários) ─────────────────────────────────

export async function getTotalCommissions(companyId: string): Promise<number> {
  const RATE_NORMAL = 0.40;
  const RATE_GRANDE = 0.50;

  const { data: clientes, error } = await supabase
    .from("customers")
    .select("funcionario_id, pool_size, price")
    .eq("company_id", companyId)
    .not("pool_size", "is", null);

  if (error) throw error;

  let total = 0;
  for (const c of clientes ?? []) {
    const price = Number(c.price) || 0;
    if (c.pool_size === "Normal") {
      total += price * RATE_NORMAL;
    } else if (c.pool_size === "Grande") {
      total += price * RATE_GRANDE;
    }
  }

  return total;
}

