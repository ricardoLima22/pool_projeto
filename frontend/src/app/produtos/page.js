'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function Produtos() {
    const [produtos, setProdutos] = useState([]);
    const [status, setStatus] = useState("Carregando...");
    const router = useRouter();

    useEffect(() => {
        async function buscarProdutos() {
            // Pegamos o ID da empresa do localStorage
            const companyId = localStorage.getItem('company_id');

            // Se não houver companyId no localStorage, podemos redirecionar para o login
            if (!companyId) {
                router.push('/login');
                return;
            }

            try {
                // Busca os produtos atrelados a esta empresa
                const { data, error } = await supabase
                    .from('products')
                    .select('*')
                    .eq('company_id', companyId);

                if (error) throw error;

                setProdutos(data || []);
                setStatus(data && data.length > 0 ? "" : "Nenhum produto cadastrado para esta empresa.");
            } catch (error) {
                setStatus("Erro ao buscar os produtos ❌");
                console.error(error);
            }
        }

        buscarProdutos();
    }, [router]);

    return (
        <main className="min-h-screen bg-slate-900 text-white p-6">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold">Meus Produtos 📦</h1>
                    <div className="flex gap-2">
                        <button
                            onClick={() => router.push('/produtos/novo')}
                            className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-xl font-medium transition-colors"
                        >
                            + Novo
                        </button>
                        <button
                            onClick={() => router.push('/home')}
                            className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-xl font-medium transition-colors"
                        >
                            Voltar
                        </button>
                    </div>
                </div>

                {status && (
                    <div className="mb-6 p-4 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 text-center">
                        {status}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {produtos.map((produto) => (
                        <div
                            key={produto.id}
                            onClick={() => router.push(`/produtos/${produto.id}`)}
                            className="bg-slate-800 p-5 rounded-2xl border border-slate-700 shadow-lg hover:border-blue-500/50 transition-all group cursor-pointer relative overflow-hidden"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <h2 className="text-xl font-bold text-slate-100 group-hover:text-blue-400 transition-colors">
                                    {produto.name}
                                </h2>
                                <span className={`text-xs font-bold px-2 py-1 rounded-md uppercase ${produto.stock_quantity > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                    {produto.stock_quantity > 0 ? `${produto.stock_quantity} Em Estoque` : 'Sem Estoque'}
                                </span>
                            </div>

                            <div className="flex items-end justify-between mt-4 border-t border-slate-700/50 pt-4">
                                <span className="text-sm text-slate-400">Preço Oculto a {produto.unit}</span>
                                <span className="text-xl font-black text-slate-300">
                                    {/* Formatar como Moeda BRL */}
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.price_per_unit || 0)}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}
