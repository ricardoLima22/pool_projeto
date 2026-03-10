// src/app/clientes/page.js
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase'; // Caminho relativo corrigido
import { useRouter } from 'next/navigation';

export default function ListagemClientes() {
    const [clientes, setClientes] = useState([]);
    const [busca, setBusca] = useState('');
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        async function fetchClientes() {
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // 1. Primeiro pegamos o company_id do perfil do usuário
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('company_id')
                    .eq('id', user.id)
                    .single();

                if (profile?.company_id) {
                    // 2. Buscamos os clientes filtrados por essa empresa
                    const { data } = await supabase
                        .from('customers')
                        .select('*')
                        .eq('company_id', profile.company_id)
                        .order('name', { ascending: true });

                    setClientes(data || []);
                }
            }
            setLoading(false);
        }
        fetchClientes();
    }, []);

    // Filtro de busca em tempo real (UX para agilizar no sol)
    const clientesFiltrados = clientes.filter(c =>
        c.name.toLowerCase().includes(busca.toLowerCase())
    );

    return (
        <main className="min-h-screen bg-slate-50 p-4">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => router.back()} className="text-slate-500 text-2xl">←</button>
                <h1 className="text-xl font-black text-slate-800 flex-1">Clientes</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => router.push('/visita/nova')}
                        className="bg-emerald-500 text-white text-sm font-bold px-4 py-2 rounded-xl shadow-md hover:bg-emerald-600 transition flex items-center gap-1"
                    >
                        Visita 📸
                    </button>
                    <button
                        onClick={() => router.push('/clientes/novo')}
                        className="bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded-xl shadow-md hover:bg-blue-700 transition flex items-center gap-1"
                    >
                        Novo 👤
                    </button>
                </div>
            </div>

            {/* Barra de Busca - Essencial para quando ele tiver 50+ clientes */}
            <div className="sticky top-0 bg-slate-50 pb-4 z-10">
                <input
                    type="text"
                    placeholder="🔍 Buscar cliente..."
                    className="w-full p-4 rounded-2xl border-none shadow-sm focus:ring-2 ring-blue-500"
                    onChange={(e) => setBusca(e.target.value)}
                />
            </div>

            {loading ? (
                <p className="text-center py-10 text-slate-400 animate-pulse">Carregando seus clientes...</p>
            ) : (
                <div className="space-y-3">
                    {clientesFiltrados.map(cliente => (
                        <div
                            key={cliente.id}
                            onClick={() => router.push(`/clientes/${cliente.id}`)}
                            className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm active:bg-blue-50 active:border-blue-200 transition-all flex justify-between items-center cursor-pointer"
                        >
                            <div>
                                <h2 className="font-bold text-slate-800 text-lg">{cliente.name}</h2>
                                <p className="text-slate-400 text-xs">📍 {cliente.address || 'Sem endereço'}</p>
                                <span className="inline-block mt-2 text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-full uppercase">
                                    {cliente.pool_volume_m3} m³
                                </span>
                            </div>
                            <span className="text-blue-500 text-xl font-light">➔</span>
                        </div>
                    ))}

                    {clientesFiltrados.length === 0 && (
                        <div className="text-center py-10">
                            <p className="text-slate-400">Nenhum cliente encontrado.</p>
                        </div>
                    )}
                </div>
            )}
        </main>
    );
}
