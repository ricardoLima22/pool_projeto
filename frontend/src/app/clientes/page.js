// src/app/clientes/page.js
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase'; // Caminho relativo corrigido
import { useRouter } from 'next/navigation';
import SplashScreen from '../../components/SplashScreen';
import { DIAS_SEMANA } from '../../lib/scheduleGenerator';
import GpsNavigationModal from '../../components/GpsNavigationModal';
import AppLayout from '../../components/AppLayout';
import { Navigation, Plus, Calendar } from 'lucide-react';

export default function ListagemClientes() {
    const [clientes, setClientes] = useState([]);
    const [busca, setBusca] = useState('');
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('');
    const [gpsClient, setGpsClient] = useState(null);
    const router = useRouter();

    useEffect(() => {
        const role = localStorage.getItem('user_role');
        if (role) setUserRole(role.toLowerCase());

        async function fetchClientes() {
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // 1. Primeiro pegamos a empresa e a role do perfil do usuário
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('company_id, role_id, roles(name)')
                    .eq('id', user.id)
                    .single();

                if (profile?.company_id) {
                    const roleName = Array.isArray(profile.roles)
                        ? profile.roles[0]?.name
                        : profile.roles?.name;

                    const storedRole = localStorage.getItem('user_role');
                    const isFuncionario = (roleName?.toLowerCase() === 'funcionario') || (storedRole?.toLowerCase() === 'funcionario');

                    // 2. Buscamos os clientes filtrados por essa empresa trazendo os dias de limpeza
                    let query = supabase
                        .from('customers')
                        .select('*, customer_cleaning_days(dia_semana)')
                        .eq('company_id', profile.company_id);

                    // Se for funcionário, exibe apenas os clientes atribuídos a ele
                    if (isFuncionario) {
                        query = query.eq('funcionario_id', user.id);
                    }

                    const { data } = await query.order('name', { ascending: true });

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

    if (loading) {
        return <SplashScreen message="Carregando seus clientes..." />;
    }

    return (
        <AppLayout
            title="Clientes"
            subtitle="Sua carteira de piscinas"
            headerActions={
                userRole !== 'funcionario' && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => router.push('/visita/nova')}
                            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white shadow-sm hover:opacity-95 transition-opacity"
                            style={{ background: "#2ECC71" }}
                        >
                            <Calendar className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Visita</span>
                        </button>
                        <button
                            onClick={() => router.push('/clientes/novo')}
                            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white shadow-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-95 transition-opacity"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Novo</span>
                        </button>
                    </div>
                )
            }
        >
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-4">
                {/* Search */}
                <div className="relative">
                    <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                    <input
                        type="text"
                        placeholder="Buscar cliente por nome ou endereço..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all shadow-xs"
                    />
                </div>

                <div className="space-y-3">
                    {clientesFiltrados.map(cliente => (
                            <div
                                key={cliente.id}
                                onClick={() => router.push(`/clientes/${cliente.id}`)}
                                className="w-full bg-white rounded-xl border border-slate-200/80 p-4 flex items-center justify-between hover:border-cyan-400/60 hover:shadow-md transition-all text-left shadow-xs active:scale-[0.99] cursor-pointer group"
                            >
                                <div className="space-y-1 flex-1 min-w-0 pr-3">
                                    <p className="font-bold text-slate-800 text-sm truncate group-hover:text-cyan-700 transition-colors">{cliente.name}</p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                                            <svg className="h-3 w-3 text-red-500 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                                            <span className="truncate">{cliente.address || 'Endereço não informado'}</span>
                                        </p>
                                        {cliente.address && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setGpsClient(cliente);
                                                }}
                                                className="shrink-0 flex items-center gap-1 text-[10px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200/70 px-1.5 py-0.5 rounded-md transition-colors"
                                                title="Abrir GPS"
                                            >
                                                <Navigation className="h-2.5 w-2.5" />
                                                GPS
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                        <span className="inline-block text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase">
                                            {cliente.pool_volume_m3} M³
                                        </span>
                                        {(() => {
                                            const diasFormatados = cliente.customer_cleaning_days && cliente.customer_cleaning_days.length > 0
                                                ? cliente.customer_cleaning_days
                                                    .sort((a,b) => (a.dia_semana === 0 ? 7 : a.dia_semana) - (b.dia_semana === 0 ? 7 : b.dia_semana))
                                                    .map(d => DIAS_SEMANA.find(ds => ds.id === d.dia_semana)?.label)
                                                    .filter(Boolean)
                                                    .join(', ')
                                                : cliente.dia_limpeza;

                                            return diasFormatados ? (
                                                <span className="inline-block text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded uppercase">
                                                    Limpeza: {diasFormatados}
                                                </span>
                                            ) : null;
                                        })()}
                                    </div>
                                </div>
                                <svg className="h-5 w-5 text-slate-400 group-hover:text-cyan-600 transition-colors shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                            </div>
                        ))}

                        {clientesFiltrados.length === 0 && (
                            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
                                <p className="text-slate-400 text-sm font-medium">Nenhum cliente encontrado.</p>
                            </div>
                        )}
                    </div>
            </div>

            <GpsNavigationModal
                isOpen={!!gpsClient}
                onClose={() => setGpsClient(null)}
                address={gpsClient?.address}
                clientName={gpsClient?.name}
            />
        </AppLayout>
    );
}
