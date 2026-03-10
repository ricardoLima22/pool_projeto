import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Carrega as variáveis do arquivo .env
load_dotenv()

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")

if not url or not key:
    raise ValueError("As chaves SUPABASE_URL ou SUPABASE_KEY não foram encontradas no .env")

# Inicializa o cliente
supabase: Client = create_client(url, key)

def testar_conexao():
    try:
        # Tenta buscar qualquer dado da tabela profiles (que criamos no SQL)
        response = supabase.table("profiles").select("*").limit(1).execute()
        print("✅ Conexão com Supabase estabelecida com sucesso!")
        print(f"Dados retornados: {response.data}")
    except Exception as e:
        print(f"❌ Erro ao conectar: {e}")

if __name__ == "__main__":
    testar_conexao()