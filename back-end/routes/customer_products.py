from fastapi import APIRouter, HTTPException, Depends
from database import supabase
from schemas import CustomerProductToggleSchema, CustomerDesignationSchema
from security import verificar_token

router = APIRouter(
    prefix="/produtos-clientes",
    tags=["Produtos nos Clientes"],
)


def _obter_contexto_usuario(token_payload: dict) -> dict:
    user_id = token_payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Usuário não identificado no token.")

    res_profile = (
        supabase.table("profiles")
        .select("id, company_id, role_id, roles(name)")
        .eq("id", user_id)
        .single()
        .execute()
    )
    profile = res_profile.data
    if not profile or not profile.get("company_id"):
        raise HTTPException(status_code=403, detail="Perfil ou empresa não encontrados.")

    roles_data = profile.get("roles")
    if isinstance(roles_data, list):
        role_name = (roles_data[0].get("name") if roles_data else "") or ""
    elif isinstance(roles_data, dict):
        role_name = roles_data.get("name") or ""
    else:
        role_name = ""

    is_dono = role_name.lower() in ("dono", "admin")

    return {
        "user_id": str(user_id),
        "company_id": str(profile["company_id"]),
        "role_name": role_name,
        "is_dono": is_dono,
    }


@router.get("/")
async def listar_produtos_nos_clientes(token_payload: dict = Depends(verificar_token)):
    try:
        ctx = _obter_contexto_usuario(token_payload)
        company_id = ctx["company_id"]
        user_id = ctx["user_id"]
        is_dono = ctx["is_dono"]

        # 1. Busca clientes conforme permissão do perfil
        query_clientes = (
            supabase.table("customers")
            .select("id, name, address, pool_volume_m3, pool_size, company_id, funcionario_id")
            .eq("company_id", company_id)
        )
        if not is_dono:
            query_clientes = query_clientes.eq("funcionario_id", user_id)

        res_clientes = query_clientes.order("name").execute()
        clientes = res_clientes.data or []

        # 2. Busca todos os produtos da empresa
        res_produtos = (
            supabase.table("products")
            .select("id, name, unit, brand_id, brands(name)")
            .eq("company_id", company_id)
            .order("name")
            .execute()
        )
        produtos = res_produtos.data or []
        valid_product_ids = {str(p["id"]) for p in produtos}

        # 3. Busca os produtos marcados nos clientes permitidos
        customer_ids = [str(c["id"]) for c in clientes]
        marked_by_customer = {cid: [] for cid in customer_ids}

        if customer_ids:
            res_vinculos = (
                supabase.table("customer_products")
                .select("customer_id, product_id")
                .eq("company_id", company_id)
                .in_("customer_id", customer_ids)
                .execute()
            )
            seen = set()
            for row in res_vinculos.data or []:
                cid = str(row["customer_id"])
                pid = str(row["product_id"])
                if cid in marked_by_customer and pid in valid_product_ids and (cid, pid) not in seen:
                    seen.add((cid, pid))
                    marked_by_customer[cid].append(pid)

        clientes_formatados = []
        clientes_com_produtos = 0
        total_produtos_marcados = 0

        for c in clientes:
            cid = str(c["id"])
            pids = marked_by_customer.get(cid, [])
            if len(pids) > 0:
                clientes_com_produtos += 1
            total_produtos_marcados += len(pids)
            clientes_formatados.append({
                **c,
                "product_ids": pids,
                "products_count": len(pids),
            })

        return {
            "role": ctx["role_name"],
            "is_dono": is_dono,
            "indicadores": {
                "total_clientes": len(clientes_formatados),
                "clientes_com_produtos": clientes_com_produtos,
                "total_produtos_marcados": total_produtos_marcados,
            },
            "customers": clientes_formatados,
            "products": produtos,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/toggle")
async def alterar_produto_no_cliente(
    dados: CustomerProductToggleSchema,
    token_payload: dict = Depends(verificar_token),
):
    try:
        ctx = _obter_contexto_usuario(token_payload)
        company_id = ctx["company_id"]
        user_id = ctx["user_id"]
        is_dono = ctx["is_dono"]

        customer_id = str(dados.customer_id)
        product_id = str(dados.product_id)

        # Valida cliente e permissão
        res_cliente = (
            supabase.table("customers")
            .select("id, company_id, funcionario_id")
            .eq("id", customer_id)
            .eq("company_id", company_id)
            .single()
            .execute()
        )
        cliente = res_cliente.data
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente não encontrado.")

        if not is_dono and str(cliente.get("funcionario_id") or "") != user_id:
            raise HTTPException(
                status_code=403,
                detail="Acesso negado: você só pode alterar produtos de clientes designados a você.",
            )

        # Valida produto da empresa
        res_produto = (
            supabase.table("products")
            .select("id")
            .eq("id", product_id)
            .eq("company_id", company_id)
            .single()
            .execute()
        )
        if not res_produto.data:
            raise HTTPException(status_code=404, detail="Produto não encontrado.")

        if dados.present:
            supabase.table("customer_products").upsert(
                {
                    "customer_id": customer_id,
                    "product_id": product_id,
                    "company_id": company_id,
                    "updated_by": user_id,
                },
                on_conflict="customer_id,product_id",
            ).execute()
        else:
            supabase.table("customer_products").delete().eq(
                "customer_id", customer_id
            ).eq("product_id", product_id).eq("company_id", company_id).execute()

        return {
            "status": "sucesso",
            "customer_id": customer_id,
            "product_id": product_id,
            "present": dados.present,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{customer_id}/designacao")
async def designar_cliente_funcionario(
    customer_id: str,
    dados: CustomerDesignationSchema,
    token_payload: dict = Depends(verificar_token),
):
    try:
        ctx = _obter_contexto_usuario(token_payload)
        if not ctx["is_dono"]:
            raise HTTPException(
                status_code=403,
                detail="Apenas o dono pode designar ou remover clientes dos funcionários.",
            )

        company_id = ctx["company_id"]
        novo_func_id = str(dados.funcionario_id) if dados.funcionario_id else None

        res_cliente = (
            supabase.table("customers")
            .select("id, company_id")
            .eq("id", customer_id)
            .eq("company_id", company_id)
            .single()
            .execute()
        )
        if not res_cliente.data:
            raise HTTPException(status_code=404, detail="Cliente não encontrado.")

        if novo_func_id:
            res_func = (
                supabase.table("profiles")
                .select("id, company_id")
                .eq("id", novo_func_id)
                .eq("company_id", company_id)
                .single()
                .execute()
            )
            if not res_func.data:
                raise HTTPException(status_code=400, detail="Funcionário inválido para esta empresa.")

        supabase.table("customers").update({"funcionario_id": novo_func_id}).eq(
            "id", customer_id
        ).eq("company_id", company_id).execute()

        supabase.table("cleaning_schedules").update({"funcionario_id": novo_func_id}).eq(
            "customer_id", customer_id
        ).eq("status", "pendente").execute()

        supabase.table("customer_cleaning_days").update({"funcionario_id": novo_func_id}).eq(
            "customer_id", customer_id
        ).execute()

        return {
            "status": "sucesso",
            "customer_id": customer_id,
            "funcionario_id": novo_func_id,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

