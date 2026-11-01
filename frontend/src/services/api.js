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
  },

  // Buscar produtos nos clientes (respeitando o perfil do usuário)
  getProdutosNosClientes: async () => {
    const headers = await getAuthHeaders();
    const response = await fetch(`/api/produtos-clientes`, { headers });
    return response.json();
  },

  // Marcar ou desmarcar produto na residência do cliente
  toggleProdutoNoCliente: async (customerId, productId, present) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`/api/produtos-clientes`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        customer_id: customerId,
        product_id: productId,
        present: Boolean(present),
      }),
    });
    return response.json();
  },

  // Designar ou remover cliente de um funcionário (exclusivo Dono)
  designarClienteFuncionario: async (customerId, funcionarioId) => {
    const headers = await getAuthHeaders();
    const response = await fetch(`/api/produtos-clientes`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        customer_id: customerId,
        funcionario_id: funcionarioId || null,
      }),
    });
    return response.json();
  }
};
