import { supabase } from '../lib/supabase';

const API_URL = "http://127.0.0.1:8000";

const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    "Authorization": session ? `Bearer ${session.access_token}` : ""
  };
};

export const api = {
  // Buscar clientes do piscineiro
  getClientes: async (piscineiroId) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/clientes/${piscineiroId}`, { headers });
    return response.json();
  },
  
  // Registrar uma nova visita
  postVisita: async (dados) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/visitas/`, {
      method: "POST",
      headers,
      body: JSON.stringify(dados),
    });
    return response.json();
  }
};