// src/app/clientes/page.js
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase'; // Caminho relativo corrigido
import { useRouter } from 'next/navigation';
import SplashScreen from '../../components/SplashScreen';

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
        <main className="min-h-screen bg-[#fcfbf8]">
            {/* Header */}
            <header className="px-4 py-4 pt-6 flex items-center justify-between bg-white border-b border-slate-200 sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.push('/home')} className="text-slate-800 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                    </button>
                    <h1 className="text-xl font-bold text-slate-800">Clientes</h1>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => router.push('/visita/nova')}
                        className="flex items-center gap-1 px-4 py-2 rounded-full text-sm font-semibold text-white shadow-sm"
                        style={{ background: "#2ECC71" }}
                    >
                        Visita 
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
                    </button>
                    <button
                        onClick={() => router.push('/clientes/novo')}
                        className="flex items-center gap-1 px-4 py-2 rounded-full text-sm font-semibold text-white shadow-sm"
                        style={{ background: "#3b82f6" }}
                    >
                        Novo 
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
                    </button>
                </div>
            </header>

            <div className="px-4 py-6 space-y-4">
                {/* Search */}
                <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                    <input
                        type="text"
                        placeholder="Buscar cliente..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="w-full pl-9 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#008080]/40 transition-colors shadow-sm"
                    />
                </div>

                {loading ? (
                    <SplashScreen message="Carregando seus clientes..." />
                ) : (
                    <div className="space-y-3">
                        {clientesFiltrados.map(cliente => (
                            <button
                                key={cliente.id}
                                onClick={() => router.push(`/clientes/${cliente.id}`)}
                                className="w-full bg-white rounded-xl border border-slate-100 p-4 flex items-center justify-between hover:border-[#008080]/30 transition-colors text-left shadow-sm active:scale-[0.99]"
                            >
                                <div className="space-y-1">
                                    <p className="font-bold text-slate-800 text-sm">{cliente.name}</p>
                                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                        <svg className="h-3 w-3 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                                        {cliente.address || 'Endereço não informado'}
                                    </p>
                                    <span className="inline-block mt-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase">
                                        {cliente.pool_volume_m3} M³
                                    </span>
                                </div>
                                <svg className="h-5 w-5 text-[#008080]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                            </button>
                        ))}

                        {clientesFiltrados.length === 0 && (
                            <div className="text-center py-10">
                                <p className="text-slate-400 text-sm">Nenhum cliente encontrado.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}
