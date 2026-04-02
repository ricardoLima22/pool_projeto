'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import SplashScreen from '../../components/SplashScreen';
import { ArrowLeft, Search, Plus, Package, ArrowRight } from "lucide-react";
import { Input } from "../../components/ui/input";

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
        <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <div className="px-4 py-4 border-b border-border bg-card">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/home')}
                            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 text-foreground" />
                        </button>
                        <h1 className="text-lg font-bold text-foreground">Meus Produtos</h1>
                    </div>
                    <button 
                        onClick={() => router.push('/produtos/novo')}
                        className="bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-full text-sm hover:bg-primary/90 transition-colors flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Novo
                    </button>
                </div>
            </div>

            <main className="px-4 py-4 max-w-7xl mx-auto w-full flex-1 space-y-4">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-card rounded-xl border border-border p-3 text-center">
                        <span className="text-lg font-bold text-foreground">{produtos.length}</span>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Produtos</p>
                    </div>
                    <div className="bg-card rounded-xl border border-border p-3 text-center">
                        <span className="text-lg font-bold text-yellow-500">
                            {produtos.filter((p) => p.status === "baixo").length}
                        </span>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Estoque baixo</p>
                    </div>
                    <div className="bg-card rounded-xl border border-border p-3 text-center">
                        <span className="text-lg font-bold text-destructive">
                            {produtos.filter((p) => p.status === "crítico").length}
                        </span>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Crítico</p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar produto ou marca..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="pl-9 bg-card border-border rounded-xl h-11"
                    />
                </div>

                {/* Product List */}
                <div className="space-y-2">
                    {filtrados.map((p) => (
                        <div
                            key={p.id}
                            onClick={() => router.push(`/produtos/${p.id}`)}
                            className="bg-card rounded-xl border border-border p-4 flex items-center justify-between hover:shadow-md transition-shadow cursor-pointer active:scale-[0.99]"
                        >
                            <div>
                                <p className="font-bold text-sm text-foreground">{p.name}</p>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Package className="w-3 h-3" /> {p.description || "Sem marca"}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {p.stock_quantity} {p.unit}
                                </p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-primary" />
                        </div>
                    ))}

                    {filtrados.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground text-sm">
                            Nenhum produto encontrado.
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
