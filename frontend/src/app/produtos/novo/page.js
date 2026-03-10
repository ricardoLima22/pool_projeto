// src/app/produtos/novo/page.js
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function NovoProduto() {
    const [nome, setNome] = useState('');
    const [unidade, setUnidade] = useState('Litro');
    const [preco, setPreco] = useState('');
    const [quantidade, setQuantidade] = useState('');
    const [companyId, setCompanyId] = useState(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        async function getCompany() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('company_id')
                    .eq('id', user.id)
                    .single();

                if (profile) setCompanyId(profile.company_id);
            }
        }
        getCompany();
    }, []);

    const handleSalvar = async (e) => {
        e.preventDefault();
        if (!companyId) return alert("Empresa não encontrada no seu perfil.");

        setLoading(true);

        const { error } = await supabase
            .from('products')
            .insert([
                {
                    name: nome,
                    unit: unidade,
                    price_per_unit: parseFloat(preco),
                    stock_quantity: parseFloat(quantidade) || 0,
                    company_id: companyId
                }
            ]);

        setLoading(false);

        if (error) {
            alert("Erro ao salvar produto: " + error.message);
        } else {
            router.push('/produtos');
        }
    };

    return (
        <main className="min-h-screen bg-slate-50 p-6">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => router.back()} className="text-slate-500 text-2xl">←</button>
                <h1 className="text-2xl font-black text-slate-800">Novo Produto</h1>
            </div>

            <form onSubmit={handleSalvar} className="bg-white p-6 rounded-[30px] border border-slate-100 shadow-sm space-y-5">

                {/* Nome do Produto */}
                <div>
                    <label className="block text-slate-500 font-bold mb-2 text-sm uppercase">Nome do Produto</label>
                    <input
                        type="text"
                        required
                        placeholder="Ex: Cloro Granulado"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="w-full p-4 rounded-2xl bg-slate-50 border-none focus:ring-2 ring-blue-500 font-medium"
                    />
                </div>

                {/* Linha Unidade e Estoque */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-slate-500 font-bold mb-2 text-sm uppercase">Unidade</label>
                        <select
                            value={unidade}
                            onChange={(e) => setUnidade(e.target.value)}
                            className="w-full p-4 rounded-2xl bg-slate-50 border-none focus:ring-2 ring-blue-500 font-medium appearance-none"
                        >
                            <option value="Unidade">Unidade</option>
                            <option value="Litro">Litro (L)</option>
                            <option value="Kg">Quilo (Kg)</option>
                            <option value="Grama">Grama (g)</option>
                            <option value="ml">Mililitro (ml)</option>
                            <option value="Pastilha">Pastilha</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-slate-500 font-bold mb-2 text-sm uppercase">Quantidade</label>
                        <input
                            type="number"
                            step="1"
                            min="0"
                            required
                            placeholder="Ex: 10"
                            value={quantidade}
                            onChange={(e) => setQuantidade(e.target.value)}
                            className="w-full p-4 rounded-2xl bg-slate-50 border-none focus:ring-2 ring-blue-500 font-medium"
                        />
                    </div>
                </div>

                {/* Preço de Custo */}
                <div>
                    <label className="block text-slate-500 font-bold mb-2 text-sm uppercase">Custo por {unidade}</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            placeholder="0.00"
                            value={preco}
                            onChange={(e) => setPreco(e.target.value)}
                            className="w-full pl-12 pr-4 p-4 rounded-2xl bg-slate-50 border-none focus:ring-2 ring-blue-500 font-medium"
                        />
                    </div>
                </div>

                {/* Botão Salvar */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-4 bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-200 active:scale-95 transition-all disabled:opacity-50"
                >
                    {loading ? 'SALVANDO...' : 'CADASTRAR PRODUTO'}
                </button>

            </form>
        </main>
    );
}
