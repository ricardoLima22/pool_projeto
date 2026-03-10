const API_URL = "http://127.0.0.1:8000";

export const api = {
  // Buscar clientes do piscineiro
  getClientes: async (piscineiroId) => {
    const response = await fetch(`${API_URL}/clientes/${piscineiroId}`);
    return response.json();
  },
  
  // Registrar uma nova visita
  postVisita: async (dados) => {
    const response = await fetch(`${API_URL}/visitas/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });
    return response.json();
  }
};