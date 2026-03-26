'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { useWeather } from '../../hooks/useWeather';
import { Droplets, LogOut, Users, AlertCircle, Thermometer } from "lucide-react";
import SplashScreen from '../../components/SplashScreen';
import { ChamadoCard } from '../../components/ChamadoCard';
import { ClientCard } from '../../components/ClientCard';

export default function EmployeeDashboard() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    
    // Métricas
    const [stats, setStats] = useState({ activeCustomers: 0, pendingTickets: 0 });
    const [upcomingVisits, setUpcomingVisits] = useState([]);
    const [myCustomers, setMyCustomers] = useState([]);
    const [dataLoading, setDataLoading] = useState(true);

    const currentHour = new Date().getHours();
    const greeting = currentHour < 12 ? "Bom dia" : currentHour < 18 ? "Boa tarde" : "Boa noite";
    const { weather, loading: weatherLoading } = useWeather();

    useEffect(() => {
        async function fetchUserAndData() {
            setLoading(true);
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                router.push('/login');
                return;
            }

            const { data: userProfile } = await supabase
                .from('profiles')
                .select('id, full_name, company_id, role_id, roles(name)')
                .eq('id', user.id)
                .single();

            if (userProfile) {
                const roleName = Array.isArray(userProfile.roles) 
                    ? userProfile.roles[0]?.name 
                    : userProfile.roles?.name;

                // Salva no localStorage para uso geral
                localStorage.setItem("company_id", userProfile.company_id);
                localStorage.setItem("role_id", userProfile.role_id);
                localStorage.setItem("user_role", roleName);
                localStorage.setItem("profile_id", userProfile.id);

                setProfile({ ...userProfile, roleName });
                setLoading(false);

                // Busca dados específicos do funcionário
                fetchMetrics(userProfile.company_id, userProfile.id);
            } else {
                setLoading(false);
            }
        }

        async function fetchMetrics(companyId, profileId) {
            setDataLoading(true);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const todayStr = today.toISOString().split('T')[0];
            const tomorrowStr = tomorrow.toISOString().split('T')[0];
            
            try {
                // Para o funcionário, podemos buscar chamados atribuídos a ele (profile_id)
                const [customersRes, ticketsCountRes, upcomingRes] = await Promise.all([
                    // Se a tabela customer não tem profile_id, listamos os clientes da empresa ou limitamos a alguns
                    supabase.from('customers').select('*').eq('company_id', companyId).limit(4),
                    
                    // Chamados abertos/pendentes atribuídos a este funcionário
                    supabase.from('service_requests')
                        .select('*', { count: 'exact', head: true })
                        .eq('company_id', companyId)
                        .eq('profile_id', profileId)
                        .in('status', ['pendente', 'Pendente', 'em_execucao', 'Em Execução']),

                    // Lista de chamados para hoje/próximos do funcionário
                    supabase.from('service_requests')
                        .select('*, customers!inner(*), service_types(name)')
                        .eq('company_id', companyId)
                        .eq('profile_id', profileId)
                        .in('status', ['pendente', 'Pendente', 'em_execucao', 'Em Execução', 'Confirmada'])
                        .gte('scheduled_date', todayStr)
                        .order('scheduled_date', { ascending: true })
                        .limit(5)
                ]);

                setStats({
                    activeCustomers: customersRes.data?.length || 0, // Apenas amostra
                    pendingTickets: ticketsCountRes.count || 0
                });
                setUpcomingVisits(upcomingRes.data || []);
                setMyCustomers(customersRes.data || []);
            } catch (error) {
                console.error("Erro ao buscar métricas", error);
            } finally {
                setDataLoading(false);
            }
        }

        fetchUserAndData();
    }, [router]);

    const handleLogout = async () => {
        localStorage.removeItem('company_id');
        localStorage.removeItem('role_id');
        localStorage.removeItem('user_role');
        localStorage.removeItem('profile_id');
        supabase.auth.signOut().catch(console.error);
        router.push('/login');
    };

    if (loading) {
        return <SplashScreen message="Carregando painel do funcionário..." />;
    }

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Header com estilo gradiente da Lovable adaptado */}
            <header className="bg-gradient-to-br from-cyan-900 to-[#0e273c] px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-10 text-white shadow-md rounded-b-[2rem]">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <Droplets className="h-6 w-6 text-cyan-400" />
                            <span className="font-bold text-lg tracking-tight">Pool Light</span>
                        </div>
                        <button onClick={handleLogout} className="flex items-center gap-2 text-sm opacity-80 hover:opacity-100 transition-opacity bg-white/10 px-3 py-1.5 rounded-full font-medium">
                            <LogOut className="h-4 w-4" />
                            Sair
                        </button>
                    </div>
                    <div className="animate-fade-in">
                        <h1 className="text-2xl font-bold tracking-tight">{greeting}, {profile?.full_name?.split(' ')[0] || 'Usuário'}!</h1>
                        <p className="text-sm opacity-80 mt-1 font-medium">Veja seus clientes e chamados do dia</p>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-5 -mt-6 relative z-10 pb-20">
                {/* Weather Card */}
                <div className="mb-4 animate-slide-up bg-white/90 backdrop-blur-md rounded-2xl p-4 border border-cyan-100/50 shadow-sm">
                    {weatherLoading ? (
                        <div className="flex items-center gap-3 text-slate-600 justify-center py-2">
                            <Thermometer className="h-5 w-5 animate-pulse text-cyan-600" />
                            <span className="text-sm font-bold uppercase tracking-widest text-cyan-900/50">Buscando clima...</span>
                        </div>
                    ) : weather ? (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <span className="text-4xl drop-shadow-sm">{weather.icon}</span>
                                <div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-black text-slate-800 tracking-tighter">{weather.temperature}°C</span>
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-md">{weather.city}</span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-400 mt-0.5">{weather.description}</p>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-3 mb-8 animate-slide-up" style={{ animationDelay: "0.1s" }}>
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100/80 text-center hover:shadow-md transition-shadow">
                        <div className="flex justify-center text-blue-500 mb-2"><Users className="h-5 w-5" /></div>
                        <p className="text-2xl font-black text-slate-800 tracking-tight">{dataLoading ? '...' : stats.activeCustomers}+</p>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Clientes na Empresa</p>
                    </div>
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100/80 text-center hover:shadow-md transition-shadow">
                        <div className="flex justify-center text-amber-500 mb-2"><AlertCircle className="h-5 w-5" /></div>
                        <p className="text-2xl font-black text-slate-800 tracking-tight">{dataLoading ? '...' : stats.pendingTickets}</p>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">Chamados Abertos</p>
                    </div>
                </div>

                {/* Chamados Section */}
                <section className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
                    <div className="flex items-center justify-between mb-4 px-1">
                        <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Meus Chamados (Hoje)</h2>
                        <span onClick={() => router.push('/chamados')} className="text-xs text-cyan-600 font-bold cursor-pointer hover:text-cyan-700 transition-colors uppercase tracking-wider">Ver todos</span>
                    </div>
                    <div className="space-y-3">
                        {dataLoading ? (
                            <div className="space-y-3 animate-pulse">
                                <div className="bg-white/60 h-24 rounded-2xl border border-slate-100"></div>
                                <div className="bg-white/60 h-24 rounded-2xl border border-slate-100"></div>
                            </div>
                        ) : upcomingVisits.length > 0 ? (
                            upcomingVisits.map((visit) => {
                                const visitDate = new Date(visit.scheduled_date);
                                const timeString = visitDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                return (
                                    <ChamadoCard
                                        key={visit.id}
                                        title={visit.service_types?.name || 'Serviço'}
                                        client={visit.customers?.name || 'Cliente Desconhecido'}
                                        address={visit.customers?.address || 'Sem endereço'}
                                        priority={visit.status === 'em_execucao' ? 'Média' : 'Alta'}
                                        time={timeString}
                                        onClick={() => router.push(`/chamados/${visit.id}`)}
                                    />
                                );
                            })
                        ) : (
                            <div className="bg-white rounded-2xl p-6 text-center border border-slate-100/80 shadow-sm">
                                <p className="text-slate-500 font-medium text-sm">Nenhum chamado pendente para hoje.</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Clientes Section */}
                <section className="mt-8 mb-4 animate-slide-up" style={{ animationDelay: "0.3s" }}>
                    <div className="flex items-center justify-between mb-4 px-1">
                        <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Acesso Rápido Clientes</h2>
                        <span onClick={() => router.push('/clientes')} className="text-xs text-cyan-600 font-bold cursor-pointer hover:text-cyan-700 transition-colors uppercase tracking-wider">Ver todos</span>
                    </div>
                    <div className="space-y-3">
                        {dataLoading ? (
                             <div className="bg-white/60 h-20 rounded-2xl border border-slate-100 animate-pulse"></div>
                        ) : myCustomers.length > 0 ? (
                            myCustomers.map((customer) => (
                                <ClientCard 
                                    key={customer.id}
                                    name={customer.name} 
                                    address={customer.address || 'Sem endereço'} 
                                    phone={customer.whatsapp || '---'} 
                                    onClick={() => router.push(`/clientes/${customer.id}`)}
                                />
                            ))
                        ) : (
                            <div className="bg-white rounded-2xl p-6 text-center border border-slate-100/80 shadow-sm">
                                <p className="text-slate-500 font-medium text-sm">Nenhum cliente disponível no momento.</p>
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}
