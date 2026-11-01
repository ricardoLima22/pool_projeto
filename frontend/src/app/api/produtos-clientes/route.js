import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAuthenticatedSupabase(req) {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
        return { supabase: null, token: null };
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
            global: {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
        }
    );

    return { supabase, token };
}

async function getAuthenticatedUserContext(supabase) {
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return { error: 'Não autenticado.', status: 401 };
    }

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, company_id, role_id, roles(name)')
        .eq('id', user.id)
        .single();

    if (profileError || !profile?.company_id) {
        return { error: 'Perfil ou empresa não encontrados.', status: 403 };
    }

    const roleName = Array.isArray(profile.roles)
        ? profile.roles[0]?.name
        : profile.roles?.name;

    const normalizedRole = (roleName || '').toLowerCase();
    const isDono = normalizedRole === 'dono' || normalizedRole === 'admin';

    return {
        user,
        companyId: profile.company_id,
        roleName: roleName || '',
        isDono,
    };
}

/**
 * GET /api/produtos-clientes
 * Lista clientes permitidos ao usuário, produtos da empresa e vínculos de produtos nos clientes.
 */
export async function GET(req) {
    try {
        const { supabase } = getAuthenticatedSupabase(req);
        if (!supabase) {
            return NextResponse.json({ error: 'Token de autorização não fornecido.' }, { status: 401 });
        }

        const ctx = await getAuthenticatedUserContext(supabase);
        if (ctx.error) {
            return NextResponse.json({ error: ctx.error }, { status: ctx.status });
        }

        const { user, companyId, isDono, roleName } = ctx;

        const [customersRes, productsRes, customerProductsRes] = await Promise.all([
            supabase.rpc('get_accessible_customers_for_products'),
            supabase
                .from('products')
                .select('id, name, unit, brands(name)')
                .eq('company_id', companyId)
                .order('name', { ascending: true }),
            supabase
                .from('customer_products')
                .select('customer_id, product_id')
                .eq('company_id', companyId),
        ]);

        if (customersRes.error) {
            return NextResponse.json({ error: customersRes.error.message }, { status: 400 });
        }
        if (productsRes.error) {
            return NextResponse.json({ error: productsRes.error.message }, { status: 400 });
        }
        if (customerProductsRes.error) {
            return NextResponse.json({ error: customerProductsRes.error.message }, { status: 400 });
        }

        const permittedCustomers = (customersRes.data || []).filter((c) =>
            isDono ? true : c.funcionario_id === user.id
        );

        const productMap = new Map();
        for (const row of customerProductsRes.data || []) {
            if (!productMap.has(row.customer_id)) {
                productMap.set(row.customer_id, new Set());
            }
            productMap.get(row.customer_id).add(row.product_id);
        }

        const customers = permittedCustomers.map((c) => ({
            ...c,
            productIds: Array.from(productMap.get(c.id) || []),
        }));

        return NextResponse.json({
            role: roleName,
            isDono,
            customers,
            products: productsRes.data || [],
        });
    } catch (err) {
        return NextResponse.json({ error: err.message || 'Erro interno no servidor.' }, { status: 500 });
    }
}

/**
 * POST /api/produtos-clientes
 * Marca ou desmarca um produto na residência de um cliente, validando permissões no back-end.
 */
export async function POST(req) {
    try {
        const { supabase } = getAuthenticatedSupabase(req);
        if (!supabase) {
            return NextResponse.json({ error: 'Token de autorização não fornecido.' }, { status: 401 });
        }

        const ctx = await getAuthenticatedUserContext(supabase);
        if (ctx.error) {
            return NextResponse.json({ error: ctx.error }, { status: ctx.status });
        }

        const { user, companyId, isDono } = ctx;
        const body = await req.json();
        const { customer_id, product_id, present } = body || {};

        if (!customer_id || !product_id || typeof present !== 'boolean') {
            return NextResponse.json(
                { error: 'Parâmetros obrigatórios: customer_id, product_id e present (boolean).' },
                { status: 400 }
            );
        }

        // Valida se o cliente pertence à empresa e se o usuário tem autorização
        const { data: customer, error: custErr } = await supabase
            .from('customers')
            .select('id, company_id, funcionario_id')
            .eq('id', customer_id)
            .eq('company_id', companyId)
            .single();

        if (custErr || !customer) {
            return NextResponse.json({ error: 'Cliente não encontrado.' }, { status: 404 });
        }

        if (!isDono && customer.funcionario_id !== user.id) {
            return NextResponse.json(
                { error: 'Acesso negado: você só pode alterar produtos de clientes designados a você.' },
                { status: 403 }
            );
        }

        // Valida se o produto pertence à mesma empresa
        const { data: product, error: prodErr } = await supabase
            .from('products')
            .select('id')
            .eq('id', product_id)
            .eq('company_id', companyId)
            .single();

        if (prodErr || !product) {
            return NextResponse.json({ error: 'Produto não encontrado.' }, { status: 404 });
        }

        if (present) {
            const { error } = await supabase.from('customer_products').upsert(
                {
                    customer_id,
                    product_id,
                    company_id: companyId,
                    updated_by: user.id,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'customer_id,product_id' }
            );
            if (error) {
                return NextResponse.json({ error: error.message }, { status: 400 });
            }
        } else {
            const { error } = await supabase
                .from('customer_products')
                .delete()
                .eq('customer_id', customer_id)
                .eq('product_id', product_id)
                .eq('company_id', companyId);
            if (error) {
                return NextResponse.json({ error: error.message }, { status: 400 });
            }
        }

        return NextResponse.json({
            status: 'sucesso',
            customer_id,
            product_id,
            present,
        });
    } catch (err) {
        return NextResponse.json({ error: err.message || 'Erro interno no servidor.' }, { status: 500 });
    }
}

/**
 * PATCH /api/produtos-clientes
 * Designa ou remove um cliente de um funcionário (exclusivo para Dono/Admin).
 */
export async function PATCH(req) {
    try {
        const { supabase } = getAuthenticatedSupabase(req);
        if (!supabase) {
            return NextResponse.json({ error: 'Token de autorização não fornecido.' }, { status: 401 });
        }

        const ctx = await getAuthenticatedUserContext(supabase);
        if (ctx.error) {
            return NextResponse.json({ error: ctx.error }, { status: ctx.status });
        }

        if (!ctx.isDono) {
            return NextResponse.json(
                { error: 'Acesso negado: apenas o dono pode designar ou remover clientes dos funcionários.' },
                { status: 403 }
            );
        }

        const body = await req.json();
        const { customer_id, funcionario_id } = body || {};

        if (!customer_id) {
            return NextResponse.json({ error: 'customer_id é obrigatório.' }, { status: 400 });
        }

        const { data, error } = await supabase.rpc('assign_customer_employee', {
            p_customer_id: customer_id,
            p_funcionario_id: funcionario_id || null,
        });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ status: 'sucesso', data });
    } catch (err) {
        return NextResponse.json({ error: err.message || 'Erro interno no servidor.' }, { status: 500 });
    }
}

