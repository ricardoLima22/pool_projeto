'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import SplashScreen from '../../components/SplashScreen';
import { ArrowLeft, Search, Plus, Package, ArrowRight } from "lucide-react";


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
                    .select('*')
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
        (p.description?.toLowerCase() || '').includes(busca.toLowerCase())
    );

    if (loading) {
        return <SplashScreen message="Buscando produtos..." />;
    }

    return (
        <main className="min-h-screen bg-[#fcfbf8]">
            {/* Header */}
            <header className="px-4 py-4 pt-6 flex items-center justify-between bg-white border-b border-slate-200 sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push('/home')} className="text-slate-800 transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <h1 className="text-xl font-bold text-slate-800">Meus Produtos</h1>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => router.push('/produtos/novo')}
                        className="flex items-center gap-1 px-4 py-2 rounded-full text-sm font-semibold text-white shadow-sm"
                        style={{ background: "#3b82f6" }}
                    >
                        Novo 
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                </div>
            </header>

            <div className="px-4 py-6 space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 text-center flex flex-col justify-center">
                        <span className="text-lg font-black text-slate-800">{produtos.length}</span>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Produtos</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 text-center flex flex-col justify-center">
                        <span className="text-lg font-black text-amber-500">
                            {produtos.filter((p) => p.status === "baixo").length}
                        </span>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Baixo</p>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 text-center flex flex-col justify-center">
                        <span className="text-lg font-black text-red-500">
                            {produtos.filter((p) => p.status === "crítico").length}
                        </span>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Crítico</p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar produto ou marca..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="w-full pl-9 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#008080]/40 transition-colors shadow-sm"
                    />
                </div>

                {/* Product List */}
                <div className="space-y-3">
                    {filtrados.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => router.push(`/produtos/${p.id}`)}
                            className="w-full bg-white rounded-xl border border-slate-100 p-4 flex items-center justify-between hover:border-[#008080]/30 transition-colors text-left shadow-sm active:scale-[0.99]"
                        >
                            <div className="space-y-1">
                                <p className="font-bold text-slate-800 text-sm">{p.name}</p>
                                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                    <Package className="w-3 h-3 text-slate-400" /> {p.description || "Sem marca"}
                                </p>
                                <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded uppercase ${p.status === 'crítico' ? 'bg-red-50 text-red-500' : p.status === 'baixo' ? 'bg-amber-50 text-amber-500' : 'bg-slate-100 text-slate-500'}`}>
                                    {p.stock_quantity} {p.unit}
                                </span>
                            </div>
                            <ArrowRight className="h-5 w-5 text-[#008080]" />
                        </button>
                    ))}

                    {filtrados.length === 0 && (
                        <div className="text-center py-10">
                            <p className="text-slate-400 text-sm">Nenhum produto encontrado.</p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
