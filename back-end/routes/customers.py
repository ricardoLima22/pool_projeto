from fastapi import APIRouter, HTTPException
from database import supabase
from schemas import ClienteSchema

router = APIRouter(prefix="/clientes", tags=["Clientes"])

@router.post("/")
async def cadastrar_cliente(cliente: ClienteSchema):
    try:
        data = cliente.model_dump() # Converte o schema em dicionário
        response = supabase.table("customers").insert(data).execute()
        return {"status": "sucesso", "cliente": response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{piscineiro_id}")
async def listar_clientes(piscineiro_id: str):
    try:
        response = supabase.table("customers").select("*").eq("piscineiro_id", piscineiro_id).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))