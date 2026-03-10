from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import customers, products, visits

app = FastAPI()

# CONFIGURAÇÃO DE CORS - Importante para o Frontend conseguir falar com o Backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(customers.router)
app.include_router(products.router)
app.include_router(visits.router)

@app.get("/")
def home():
    return {"status": "API Online e Pronta para o Mobile"}