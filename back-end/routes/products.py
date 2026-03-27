from fastapi import APIRouter, HTTPException, Depends
from database import supabase # Importamos o cliente que configuramos acima
from pydantic import BaseModel
from schemas import ProdutoSchema
from security import verificar_token

router = APIRouter(prefix="/produtos", tags=["Produtos"], dependencies=[Depends(verificar_token)])


@router.post("/")
async def cadastrar_produto(produto: ProdutoSchema):
    try:
        data = produto.model_dump()
        response = supabase.table("products").insert(data).execute()
        return {"status": "sucesso", "produto": response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{piscineiro_id}")
async def listar_produtos(piscineiro_id: str):
    try:
        # Busca os produtos cadastrados por aquele piscineiro específico
        response = supabase.table("products").select("*").eq("piscineiro_id", piscineiro_id).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))