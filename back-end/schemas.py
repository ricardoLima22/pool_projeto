from pydantic import BaseModel
from typing import Dict, Optional
from uuid import UUID


class ProdutoSchema(BaseModel):
    company_id: UUID
    name: str
    unit: str
    price_per_unit: float
    stock_quantity: float = 0.0

class ClienteSchema(BaseModel):
    company_id: UUID
    name: str
    whatsapp: str
    email: str
    address: str
    pool_volume_m3: float

class VisitaSchema(BaseModel):
    piscineiro_id: UUID
    customer_id: UUID
    products_used: Optional[dict] = {}
    total_price: float = 0.0
    was_paid_on_spot: Optional[bool] = False
    sent_to_whatsapp: Optional[bool] = False
    photo_url: Optional[str] = None