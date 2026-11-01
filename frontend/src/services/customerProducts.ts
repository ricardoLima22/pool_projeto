import { supabase } from "@/lib/supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CompanyProduct = {
  id: string;
  name: string;
  unit: string;
  brand_name: string | null;
};

export type CompanyEmployee = {
  id: string;
  full_name: string;
  role_name: string;
};

export type CustomerWithProducts = {
  id: string;
  name: string;
  address: string | null;
  pool_volume_m3: number | null;
  pool_size: string | null;
  company_id: string;
  funcionario_id: string | null;
  funcionario_name: string | null;
  productIds: string[];
};

export type CustomerProductsInitialData = {
  userId: string;
  companyId: string;
  isDono: boolean;
  roleName: string;
  customers: CustomerWithProducts[];
  products: CompanyProduct[];
  employees: CompanyEmployee[];
};

// ─── Queries & Mutations ─────────────────────────────────────────────────────

/**
 * Carrega os clientes permitidos pelo perfil do usuário autenticado,
 * os produtos da empresa, os vínculos de produtos presentes em cada cliente
 * e (para o Dono/Admin) a lista de funcionários para designação.
 */
export async function loadCustomerProductsData(): Promise<CustomerProductsInitialData | null> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, company_id, role_id, roles(name)")
    .eq("id", user.id)
    .single();

  if (profileError || !profile?.company_id) {
    throw new Error("Perfil ou empresa do usuário não encontrados.");
  }

  const rawRoles = profile.roles as unknown;
  const roleName = Array.isArray(rawRoles)
    ? (rawRoles[0] as { name?: string })?.name || ""
    : (rawRoles as { name?: string } | null)?.name || "";

  const normalizedRole = roleName.toLowerCase();
  const isDono = normalizedRole === "dono" || normalizedRole === "admin";
  const companyId = profile.company_id as string;

  // 1. Busca clientes via RPC segura no banco (que valida Dono vs Funcionário diretamente no Postgres)
  const [customersRpcRes, productsRes, customerProductsRes, employeesRes] =
    await Promise.all([
      supabase.rpc("get_accessible_customers_for_products"),
      supabase
        .from("products")
        .select("id, name, unit, brands(name)")
        .eq("company_id", companyId)
        .order("name", { ascending: true }),
      supabase
        .from("customer_products")
        .select("customer_id, product_id")
        .eq("company_id", companyId),
      isDono
        ? supabase
            .from("profiles")
            .select("id, full_name, ativo, roles(name)")
            .eq("company_id", companyId)
            .eq("ativo", true)
            .order("full_name", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (customersRpcRes.error) {
    throw customersRpcRes.error;
  }
  if (productsRes.error) {
    throw productsRes.error;
  }
  if (customerProductsRes.error) {
    throw customerProductsRes.error;
  }

  // Mapeia os produtos válidos da empresa (para ignorar vínculos órfãos se houver)
  const validProductIds = new Set<string>();
  const products: CompanyProduct[] = (productsRes.data ?? []).map((p: Record<string, unknown>) => {
    const id = String(p.id);
    validProductIds.add(id);
    const brandsField = p.brands as { name?: string } | { name?: string }[] | null;
    const brandName = Array.isArray(brandsField)
      ? brandsField[0]?.name ?? null
      : brandsField?.name ?? null;

    return {
      id,
      name: String(p.name ?? ""),
      unit: String(p.unit ?? ""),
      brand_name: brandName,
    };
  });

  // Agrupa product_ids por customer_id evitando duplicatas
  const productsByCustomer = new Map<string, Set<string>>();
  for (const row of customerProductsRes.data ?? []) {
    const cId = String(row.customer_id);
    const pId = String(row.product_id);
    if (!validProductIds.has(pId)) continue;
    if (!productsByCustomer.has(cId)) {
      productsByCustomer.set(cId, new Set<string>());
    }
    productsByCustomer.get(cId)!.add(pId);
  }

  // Filtra também na camada de serviço por segurança adicional
  const rawCustomers = (customersRpcRes.data ?? []) as Array<{
    id: string;
    name: string;
    address: string | null;
    pool_volume_m3: number | null;
    pool_size: string | null;
    company_id: string;
    funcionario_id: string | null;
    funcionario_name: string | null;
  }>;

  const permittedCustomers = isDono
    ? rawCustomers
    : rawCustomers.filter((c) => c.funcionario_id === user.id);

  const customers: CustomerWithProducts[] = permittedCustomers.map((c) => ({
    ...c,
    productIds: Array.from(productsByCustomer.get(c.id) ?? []),
  }));

  const employees: CompanyEmployee[] = [];
  if (isDono && employeesRes.data) {
    for (const emp of employeesRes.data as Array<Record<string, unknown>>) {
      const empRoles = emp.roles as { name?: string } | { name?: string }[] | null;
      const empRoleName = Array.isArray(empRoles)
        ? empRoles[0]?.name ?? ""
        : empRoles?.name ?? "";
      if (
        emp.ativo === true &&
        ["funcionario", "dono", "admin"].includes(empRoleName.toLowerCase())
      ) {
        employees.push({
          id: String(emp.id),
          full_name: String(emp.full_name ?? ""),
          role_name: empRoleName,
        });
      }
    }
  }

  return {
    userId: user.id,
    companyId,
    isDono,
    roleName,
    customers,
    products,
    employees,
  };
}

/**
 * Marca ou desmarca um produto na residência do cliente.
 * As políticas RLS do PostgreSQL garantem no back-end que:
 * - O Dono pode alterar produtos de qualquer cliente da sua empresa.
 * - O Funcionário só pode alterar produtos de clientes designados a ele.
 * - A constraint UNIQUE(customer_id, product_id) impede duplicidades.
 */
export async function setCustomerProductPresence(params: {
  customerId: string;
  productId: string;
  companyId: string;
  present: boolean;
}): Promise<void> {
  const { customerId, productId, companyId, present } = params;

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  if (present) {
    const { error } = await supabase.from("customer_products").upsert(
      {
        customer_id: customerId,
        product_id: productId,
        company_id: companyId,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "customer_id,product_id" }
    );

    if (error) {
      throw new Error(
        error.code === "42501"
          ? "Sem permissão para alterar os produtos deste cliente."
          : error.message
      );
    }
  } else {
    const { error } = await supabase
      .from("customer_products")
      .delete()
      .eq("customer_id", customerId)
      .eq("product_id", productId)
      .eq("company_id", companyId);

    if (error) {
      throw new Error(
        error.code === "42501"
          ? "Sem permissão para alterar os produtos deste cliente."
          : error.message
      );
    }
  }
}

/**
 * Designa ou remove um cliente de um funcionário.
 * Executado via função RPC no banco que valida explicitamente se o usuário é Dono/Admin
 * e sincroniza também os agendamentos pendentes e dias de limpeza do cliente.
 */
export async function assignCustomerToEmployee(
  customerId: string,
  funcionarioId: string | null
): Promise<void> {
  const { error } = await supabase.rpc("assign_customer_employee", {
    p_customer_id: customerId,
    p_funcionario_id: funcionarioId || null,
  });

  if (error) {
    throw new Error(
      error.code === "42501"
        ? "Apenas o dono pode designar ou remover clientes dos funcionários."
        : error.message
    );
  }
}

