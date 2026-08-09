from pydantic import BaseModel
from typing import Dict, Optional, List
from uuid import UUID


class ProdutoSchema(BaseModel):
    company_id: UUID
    name: str
    unit: str
    price_per_unit: float
    stock_quantity: float = 0.0

class DiaLimpezaSchema(BaseModel):
    customer_id: UUID
    dia_semana: int # 0=Dom, 1=Seg, ..., 6=Sáb
    horario_preferencial: Optional[str] = None
    funcionario_id: Optional[UUID] = None

class ClienteSchema(BaseModel):
    company_id: UUID
    name: str
    whatsapp: str
    email: str
    address: str
    pool_volume_m3: float
    dia_limpeza: Optional[str] = None
    dias_limpeza: Optional[List[int]] = None

class AgendamentoSchema(BaseModel):
    customer_id: UUID
    funcionario_id: Optional[UUID] = None
    company_id: Optional[UUID] = None
    data_agendada: str
    status: Optional[str] = 'pendente'
    observacao: Optional[str] = None

class VisitaSchema(BaseModel):
    piscineiro_id: UUID
    customer_id: UUID
    products_used: Optional[dict] = {}
    total_price: float = 0.0
    was_paid_on_spot: Optional[bool] = False
    sent_to_whatsapp: Optional[bool] = False
    photo_url: Optional[str] = None