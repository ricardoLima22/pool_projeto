import os
import jwt
from fastapi import Depends, HTTPException, Header
from dotenv import load_dotenv

load_dotenv()

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

async def verificar_token(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Token de autorização não fornecido")

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Header Authorization inválido. Formato esperado: 'Bearer <token>'")
    
    token = authorization.split(" ")[1]
    
    if not SUPABASE_JWT_SECRET:
        raise HTTPException(status_code=500, detail="Configuração de segurança JWT ausente no servidor")

    try:
        # Decodifica o token usando a chave secreta do Supabase (algoritmo HS256)
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated"
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Sessão expirada. Faça login novamente.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token fornecido é inválido ou malformado.")
