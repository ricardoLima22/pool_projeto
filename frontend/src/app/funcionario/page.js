'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { useWeather } from '../../hooks/useWeather';
import { Droplets, LogOut, Users, AlertCircle, Thermometer, Camera, Calendar, TrendingUp } from "lucide-react";
import SplashScreen from '../../components/SplashScreen';
import { ChamadoCard } from '../../components/ChamadoCard';
import { ClientCard } from '../../components/ClientCard';

const StatCard = ({ icon, value, label, onClick }) => (
    <div
        onClick={onClick}
        className={`bg-white rounded-xl p-3 sm:p-4 shadow-sm border border-slate-200 text-center flex flex-col justify-between items-center overflow-hidden ${onClick ? 'cursor-pointer hover:shadow-md hover:border-cyan-200 transition-all active:scale-95' : ''}`}
    >
        <div className="flex justify-center text-cyan-600 mb-1">{icon}</div>
        <p className="text-xs sm:text-sm md:text-xl font-bold text-slate-800 tracking-tight truncate w-full" title={String(value)}>
            {value}
        </p>
        <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate w-full">{label}</p>
    </div>
);

export default function EmployeeDashboard() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    
    // Métricas
    const [stats, setStats] = useState({ activeCustomers: 0, pendingTickets: 0, myCommissions: null });
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
            const agora = new Date();
            const yearStr = agora.getFullYear();
            const monthStr = String(agora.getMonth() + 1).padStart(2, '0');
            const dateStr = String(agora.getDate()).padStart(2, '0');
            const todayStr = `${yearStr}-${monthStr}-${dateStr}`;

            try {
                const inicioHoje = `${todayStr}T00:00:00.000Z`;
                const fimHoje = `${todayStr}T23:59:59.999Z`;

                const [myCustomersRes, allSchedulesRes, allCustomersRes, visitsTodayRes] = await Promise.all([
                    // Clientes atribuídos a este funcionário
                    supabase.from('customers')
                        .select('*')
                        .eq('company_id', companyId)
                        .eq('funcionario_id', profileId)
                        .order('name', { ascending: true }),

                    // Limpezas de hoje na empresa
                    supabase.from('cleaning_schedules')
                        .select('*, customers!inner(*)')
                        .eq('company_id', companyId)
                        .eq('data_agendada', todayStr)
                        .order('created_at', { ascending: true }),

                    // Todos os clientes atualizados da empresa
                    supabase.from('customers')
                        .select('id, name, address, pool_size, funcionario_id')
                        .eq('company_id', companyId),

                    // Visitas já realizadas hoje
                    supabase.from('visits')
                        .select('customer_id')
                        .gte('created_at', inicioHoje)
                        .lte('created_at', fimHoje)
                ]);

                const assignedCustomers = myCustomersRes.data || [];

                const completedCustomerIds = new Set(
                    (visitsTodayRes.data || []).map(v => v.customer_id)
                );

                const customerMap = {};
                (allCustomersRes.data || []).forEach((cust) => {
                    customerMap[cust.id] = cust;
                });

                // Filtrar apenas as limpezas de hoje dos clientes atribuídos a este funcionário
                const todayVisits = (allSchedulesRes.data || []).filter((s) => {
                    const cust = customerMap[s.customer_id] || (Array.isArray(s.customers) ? s.customers[0] : s.customers);
                    const assignedId = cust?.funcionario_id || s.funcionario_id;
                    return assignedId === profileId;
                }).map((s) => {
                    const cust = customerMap[s.customer_id] || (Array.isArray(s.customers) ? s.customers[0] : s.customers);
                    const isCompletedInSchedule = s.status?.toLowerCase() === 'concluido' || s.status?.toLowerCase() === 'concluído';
                    const isCompletedInVisits = completedCustomerIds.has(s.customer_id);
                    const resolvedStatus = (isCompletedInSchedule || isCompletedInVisits) ? 'concluido' : 'pendente';
                    return {
                        ...s,
                        customers: cust || s.customers,
                        status: resolvedStatus
                    };
                });

                let totalComissaoSum = 0;
                (assignedCustomers || []).forEach((c) => {
                    const price = c.price || 0;
                    const rate = c.pool_size === 'Grande' ? 0.50 : 0.40;
                    totalComissaoSum += price * rate;
                });
                const formattedCommission = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalComissaoSum);

                setStats({
                    activeCustomers: assignedCustomers.length,
                    pendingTickets: todayVisits.length,
                    myCommissions: formattedCommission
                });
                setUpcomingVisits(todayVisits);
                setMyCustomers(assignedCustomers.slice(0, 4));
            } catch (error) {
                console.error("Erro ao buscar métricas do funcionário", error);
            } finally {
                setDataLoading(false);
            }
        }

        fetchUserAndData();

        return () => {
            const metaTheme = document.querySelector('meta[name="theme-color"]');
            if (metaTheme) metaTheme.setAttribute('content', '#ffffff');

            document.documentElement.style.backgroundColor = '#fcfbf8';
            document.body.style.backgroundColor = '#fcfbf8';
        };
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
        <div className="min-h-screen font-sans flex flex-col">
            {/* Header */}
            <header className="gradient-hero px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-10 text-white shadow-md">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <Droplets className="h-6 w-6 text-cyan-200" />
                            <span className="font-bold tracking-tight text-lg">Pureza Azul</span>
                        </div>
                        <button onClick={handleLogout} className="flex items-center gap-2 text-sm opacity-80 hover:opacity-100 transition-opacity">
                            <LogOut className="h-4 w-4" />
                            Sair
                        </button>
                    </div>
                    <h1 className="text-2xl font-bold animate-fade-in">{greeting}, {profile?.full_name?.split(' ')[0] || 'Usuário'}!</h1>
                    <p className="text-sm opacity-75 mt-1">Veja seus clientes e chamados do dia</p>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 bg-slate-50 pb-24">
                <main className="max-w-4xl mx-auto px-5 -mt-8 relative z-20">
                {/* Weather Card */}
                <div className="mb-4 animate-slide-up bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-cyan-100 shadow-sm">
                    {weatherLoading ? (
                        <div className="flex items-center gap-3 text-slate-600 justify-center py-2">
                            <Thermometer className="h-5 w-5 animate-pulse text-cyan-600" />
                            <span className="text-sm font-bold uppercase tracking-widest">Buscando clima...</span>
                        </div>
                    ) : weather ? (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <span className="text-5xl drop-shadow-md">{weather.icon}</span>
                                <div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-3xl font-bold text-slate-800">{weather.temperature}°C</span>
                                        <span className="text-xs text-slate-500 uppercase">{weather.city}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">{weather.description}</p>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-3 mb-8 animate-slide-up" style={{ animationDelay: "0.1s" }}>
                    <StatCard icon={<Calendar className="h-6 w-6" />} value={dataLoading ? '...' : stats.pendingTickets} label="Visitas hoje" />
                    <StatCard icon={<Users className="h-6 w-6" />} value={dataLoading ? '...' : stats.activeCustomers} label="Meus clientes" />
                    <StatCard icon={<TrendingUp className="h-6 w-6 text-emerald-500" />} value={dataLoading ? '...' : (stats.myCommissions || 'R$ 0,00')} label="Comissão" />
                </div>

                {/* Register Visit CTA */}
                <div className="animate-slide-up mb-8" style={{ animationDelay: "0.15s" }}>
                    <button onClick={() => router.push('/visita/nova')} className="w-full gradient-success text-white rounded-xl p-5 text-left shadow-md hover:shadow-xl transition-shadow group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 group-active:scale-110 transition-transform"></div>
                        <div className="flex items-center justify-between relative z-10">
                            <div>
                                <p className="text-lg font-bold tracking-tight mb-0.5">Registrar Visita</p>
                                <p className="text-emerald-50 text-sm opacity-90">Fotos, medições e cobrança</p>
                            </div>
                            <div className="bg-emerald-700/30 rounded-full p-3 group-hover:scale-110 transition-transform">
                                <Camera className="h-6 w-6 text-white" />
                            </div>
                        </div>
                    </button>
                </div>

                {/* Visitas de Hoje Section */}
                <section className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Visitas de Hoje</h2>
                    </div>
                    <div className="space-y-3">
                        {dataLoading ? (
                            <div className="space-y-3 animate-pulse">
                                <div className="bg-card h-24 rounded-xl border border-border"></div>
                                <div className="bg-card h-24 rounded-xl border border-border"></div>
                            </div>
                        ) : upcomingVisits.length > 0 ? (
                            upcomingVisits.map((visit) => {
                                return (
                                    <ChamadoCard
                                        key={visit.id}
                                        title={visit.customers?.pool_size ? `Piscina ${visit.customers.pool_size}` : 'Limpeza de Piscina'}
                                        client={visit.customers?.name || 'Cliente Desconhecido'}
                                        address={visit.customers?.address || 'Sem endereço'}
                                        status={visit.status}
                                        onClick={() => router.push(`/visita/nova?clienteId=${visit.customer_id}`)}
                                    />
                                );
                            })
                        ) : (
                            <div className="bg-card rounded-xl p-6 text-center border border-border mt-4">
                                <p className="text-muted-foreground font-medium text-sm">Nenhuma limpeza agendada para você hoje.</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Clientes Section */}
                <section className="mt-8 mb-8 animate-slide-up" style={{ animationDelay: "0.3s" }}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Meus Clientes</h2>
                        <span onClick={() => router.push('/clientes')} className="text-xs text-primary font-medium cursor-pointer hover:underline">Ver todos</span>
                    </div>
                    <div className="space-y-3">
                        {dataLoading ? (
                             <div className="bg-card h-20 rounded-xl border border-border animate-pulse"></div>
                        ) : myCustomers.length > 0 ? (
                            myCustomers.map((customer) => (
                                <ClientCard 
                                    key={customer.id}
                                    name={customer.name} 
                                    address={customer.address || 'Sem endereço'} 
                                    phone={customer.whatsapp || 'Não informado'} 
                                    onClick={() => router.push(`/clientes/${customer.id}`)}
                                />
                            ))
                        ) : (
                            <div className="bg-card rounded-xl p-6 text-center border border-border mt-4">
                                <p className="text-muted-foreground font-medium text-sm">Nenhum cliente disponível no momento.</p>
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    </div>
);
}
