from fastapi import APIRouter, HTTPException, Depends
from database import supabase
from schemas import ClienteSchema
from security import verificar_token

router = APIRouter(prefix="/clientes", tags=["Clientes"], dependencies=[Depends(verificar_token)])

@router.post("/")
async def cadastrar_cliente(cliente: ClienteSchema):
    try:
        data = cliente.model_dump()
        dias_limpeza = data.pop("dias_limpeza", None)
        
        response = supabase.table("customers").insert(data).execute()
        novo_cliente = response.data[0]

        if dias_limpeza and len(dias_limpeza) > 0:
            cleaning_days_data = [
                {"customer_id": novo_cliente["id"], "dia_semana": dia}
                for dia in dias_limpeza
            ]
            supabase.table("customer_cleaning_days").insert(cleaning_days_data).execute()

        return {"status": "sucesso", "cliente": novo_cliente}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{piscineiro_id}")
async def listar_clientes(piscineiro_id: str):
    try:
        response = supabase.table("customers").select("*, customer_cleaning_days(dia_semana)").eq("piscineiro_id", piscineiro_id).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))