// src/app/produtos/[id]/page.js
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import SplashScreen from '../../../components/SplashScreen';

export default function DetalhesProduto() {
    const [produto, setProduto] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editando, setEditando] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [deletando, setDeletando] = useState(false);

    // Estados do Formulário de Edição
    const [nome, setNome] = useState('');
    const [unidade, setUnidade] = useState('');
    const [preco, setPreco] = useState('');
    const [quantidade, setQuantidade] = useState('');

    const params = useParams();
    const router = useRouter();
    const produtoId = params.id;

    useEffect(() => {
        async function fetchProduto() {
            const { data, error } = await supabase
                .from('products')
                .select('*')
                .eq('id', produtoId)
                .single();

            if (!error && data) {
                setProduto(data);
                setNome(data.name);
                setUnidade(data.unit);
                setPreco(data.price_per_unit);
                setQuantidade(data.stock_quantity);
            }
            setLoading(false);
        }
        fetchProduto();
    }, [produtoId]);

    const handleSalvar = async (e) => {
        e.preventDefault();

        const nomeLimpo = nome.trim();
        if (nomeLimpo.length < 3) {
            alert('Por favor, informe um nome de produto válido com pelo menos 3 letras.');
            return;
        }

        setSalvando(true);

        const { error } = await supabase
            .from('products')
            .update({
                name: nomeLimpo,
                unit: unidade,
                price_per_unit: parseFloat(preco),
                stock_quantity: parseFloat(quantidade)
            })
            .eq('id', produtoId);

        setSalvando(false);

        if (error) {
            alert("Erro ao atualizar: " + error.message);
        } else {
            setProduto({
                ...produto,
                name: nomeLimpo,
                unit: unidade,
                price_per_unit: parseFloat(preco),
                stock_quantity: parseFloat(quantidade)
            });
            setNome(nomeLimpo);
            setEditando(false);
        }
    };

    const handleDeletar = async () => {
        if (confirm(`Tem certeza que deseja APAGAR o produto ${produto.name}?`)) {
            setDeletando(true);
            const { error } = await supabase
                .from('products')
                .delete()
                .eq('id', produtoId);

            if (!error) {
                router.push('/produtos');
            } else {
                alert("Erro ao remover: " + error.message);
                setDeletando(false);
            }
        }
    };

    if (loading) return <SplashScreen message="Carregando produto..." />;
    if (!produto) return <p className="p-10 text-center text-red-500 font-bold">Produto não encontrado.</p>;

    return (
        <main className="min-h-screen bg-slate-50 p-6 pb-32">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="text-slate-500 text-2xl">←</button>
                    <h1 className="text-2xl font-black text-slate-800">Estoque</h1>
                </div>
                {!editando && (
                    <button
                        onClick={() => setEditando(true)}
                        className="text-blue-600 font-bold bg-blue-50 px-4 py-2 rounded-xl"
                    >
                        Editar
                    </button>
                )}
            </div>

            {!editando ? (
                // VISUALIZAÇÃO DOS DETALHES
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-[30px] shadow-sm border border-slate-100 flex flex-col items-center">
                        <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 text-4xl mb-4">
                            🧪
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 text-center">{produto.name}</h2>
                        <p className="text-slate-400 font-bold text-sm bg-slate-50 px-3 py-1 rounded-lg mt-2 uppercase tracking-wide">
                            Vendendo a {produto.unit}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-100 flex flex-col justify-center items-center">
                            <span className="text-slate-400 font-bold text-xs uppercase mb-1">Custo por {produto.unit}</span>
                            <span className="text-3xl font-black text-slate-800">
                                R$ {parseFloat(produto.price_per_unit).toFixed(2)}
                            </span>
                        </div>

                        <div className={`p-6 rounded-[24px] shadow-sm border flex flex-col justify-center items-center ${produto.stock_quantity > 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                            <span className={`font-bold text-xs uppercase mb-1 ${produto.stock_quantity > 0 ? 'text-emerald-600' : 'text-red-500'}`}>Em Estoque</span>
                            <span className={`text-4xl font-black ${produto.stock_quantity > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                {produto.stock_quantity}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={handleDeletar}
                        disabled={deletando}
                        className="w-full mt-8 p-4 text-red-500 font-bold bg-white border border-red-100 rounded-2xl active:bg-red-50 transition-colors"
                    >
                        {deletando ? 'Apagando...' : 'Excluir Produto'}
                    </button>
                </div>
            ) : (
                // MODO EDIÇÃO
                <form onSubmit={handleSalvar} className="space-y-5 bg-white p-6 rounded-[30px] shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-black text-slate-800 text-lg">Editar Produto</h3>
                        <button
                            type="button"
                            onClick={() => {
                                setEditando(false);
                                setNome(produto.name);
                                setUnidade(produto.unit);
                                setPreco(produto.price_per_unit);
                                setQuantidade(produto.stock_quantity);
                            }}
                            className="text-slate-400 font-bold text-sm"
                        >
                            Cancelar
                        </button>
                    </div>

                    <div>
                        <label className="block text-slate-500 font-bold mb-2 text-xs uppercase">Nome</label>
                        <input
                            type="text" required value={nome} onChange={(e) => setNome(e.target.value)}
                            className="w-full p-4 rounded-2xl bg-slate-50 border-none focus:ring-2 ring-blue-500 font-medium"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-slate-500 font-bold mb-2 text-xs uppercase">Unidade</label>
                            <select
                                value={unidade} onChange={(e) => setUnidade(e.target.value)}
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
                            <label className="block text-slate-500 font-bold mb-2 text-xs uppercase">Total Estoque</label>
                            <input
                                type="number" step="1" required value={quantidade} onChange={(e) => setQuantidade(e.target.value)}
                                className="w-full p-4 rounded-2xl bg-slate-50 border-none focus:ring-2 ring-blue-500 font-medium"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-slate-500 font-bold mb-2 text-xs uppercase">Custo {unidade}</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                            <input
                                type="number" step="0.01" min="0" required value={preco} onChange={(e) => setPreco(e.target.value)}
                                className="w-full pl-12 pr-4 p-4 rounded-2xl bg-slate-50 border-none focus:ring-2 ring-blue-500 font-medium"
                            />
                        </div>
                    </div>

                    <button
                        type="submit" disabled={salvando}
                        className="w-full mt-4 bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-200 active:scale-95 transition-all"
                    >
                        {salvando ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
                    </button>
                </form>
            )}
        </main>
    );
}
