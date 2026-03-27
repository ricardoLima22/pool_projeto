# backend/routes/visits.py
from fastapi import APIRouter, HTTPException, Depends
from database import supabase
from schemas import VisitaSchema
from security import verificar_token

router = APIRouter(prefix="/visitas", tags=["Visitas"], dependencies=[Depends(verificar_token)])

@router.post("/")
async def registrar_visita(visita: VisitaSchema):
    try:
        # 1. Buscar os preços dos produtos deste piscineiro
        res_produtos = supabase.table("products")\
            .select("name, price_per_unit")\
            .eq("piscineiro_id", visita.piscineiro_id)\
            .execute()
        
        precos_dict = {p['name']: float(p['price_per_unit']) for p in res_produtos.data}

        # 2. Calcular o valor total e montar o resumo para o WhatsApp
        total_price = 0
        detalhes_msg = ""
        
        for nome_prod, qtd in visita.products_used.items():
            preco = precos_dict.get(nome_prod, 0)
            subtotal = qtd * preco
            total_price += subtotal
            detalhes_msg += f"- {nome_prod}: {qtd} un (R$ {subtotal:.2f})\n"

        # 3. Salvar a visita no banco de dados
        data_insert = {
            "piscineiro_id": visita.piscineiro_id,
            "customer_id": visita.customer_id,
            "products_used": visita.products_used,
            "total_price": total_price,
            "was_paid_on_spot": visita.was_paid_on_spot
        }
        
        res_visita = supabase.table("visits").insert(data_insert).execute()

        # 4. Retornar os dados e o texto pronto para o WhatsApp
        return {
            "status": "sucesso",
            "total_cobrado": total_price,
            "texto_whatsapp": f"✅ Manutenção Finalizada!\n\nProdutos utilizados:\n{detalhes_msg}\nTotal: R$ {total_price:.2f}"
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))