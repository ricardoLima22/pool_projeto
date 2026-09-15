'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import SplashScreen from '../../components/SplashScreen';
import AppLayout from '../../components/AppLayout';
import { Search, Plus, Package, ArrowRight } from "lucide-react";

export default function Produtos() {
    const [produtos, setProdutos] = useState([]);
    const [busca, setBusca] = useState("");
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        async function buscarProdutos() {
            const companyId = localStorage.getItem('company_id');

            if (!companyId) {
                router.push('/login');
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('products')
                    .select('*, brands(name)')
                    .eq('company_id', companyId);

                if (error) throw error;
                // Add a "status" field for counting logic
                const computedProducts = (data || []).map(p => ({
                    ...p,
                    status: p.stock_quantity === 0 ? 'crítico' : (p.stock_quantity <= 5 ? 'baixo' : 'ok')
                }));
                
                setProdutos(computedProducts);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }

        buscarProdutos();
    }, [router]);

    const filtrados = produtos.filter((p) =>
        (p.name?.toLowerCase() || '').includes(busca.toLowerCase()) ||
        (p.brands?.name?.toLowerCase() || p.description?.toLowerCase() || '').includes(busca.toLowerCase())
    );

    if (loading) {
        return <SplashScreen message="Buscando produtos..." />;
    }

    return (
        <AppLayout
            title="Meus Produtos"
            subtitle="Controle de estoque de insumos"
            headerActions={
                <button
                    onClick={() => router.push('/produtos/novo')}
                    className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white shadow-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-95 transition-opacity"
                >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Novo</span>
                </button>
            }
        >
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-3 text-center flex flex-col justify-center">
                        <span className="text-xl font-bold text-slate-800">{produtos.length}</span>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Produtos</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-3 text-center flex flex-col justify-center">
                        <span className="text-xl font-bold text-amber-500">
                            {produtos.filter((p) => p.status === "baixo").length}
                        </span>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Baixo</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-3 text-center flex flex-col justify-center">
                        <span className="text-xl font-bold text-red-500">
                            {produtos.filter((p) => p.status === "crítico").length}
                        </span>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Crítico</p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar produto por nome, marca ou descrição..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all shadow-xs"
                    />
                </div>

                {/* Product List */}
                <div className="space-y-3">
                    {filtrados.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => router.push(`/produtos/${p.id}`)}
                            className="w-full bg-white rounded-xl border border-slate-200/80 p-4 flex items-center justify-between hover:border-cyan-400/60 hover:shadow-md transition-all text-left shadow-xs active:scale-[0.99] group"
                        >
                            <div className="space-y-1">
                                <p className="font-bold text-slate-800 text-sm group-hover:text-cyan-700 transition-colors">{p.name}</p>
                                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                    <Package className="w-3.5 h-3.5 text-slate-400" /> {p.brands?.name || p.description || "Sem marca"}
                                </p>
                                <p className={`text-xs mt-0.5 font-medium ${p.status === 'crítico' ? 'text-red-500 font-bold' : (p.status === 'baixo' ? 'text-amber-500 font-semibold' : 'text-slate-500')}`}>
                                    Estoque: {p.stock_quantity} {p.unit}
                                </p>
                            </div>
                            <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-cyan-600 transition-colors" />
                        </button>
                    ))}

                    {filtrados.length === 0 && (
                        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
                            <p className="text-slate-400 text-sm font-medium">Nenhum produto encontrado.</p>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
