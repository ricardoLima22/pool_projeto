'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { useWeather } from '../../hooks/useWeather';
import { Droplets, LogOut, Users, AlertCircle, Thermometer, Camera } from "lucide-react";
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
                const [customersRes, customersCountRes, ticketsCountRes, upcomingRes] = await Promise.all([
                    // Se a tabela customer não tem profile_id, listamos os clientes da empresa ou limitamos a alguns
                    supabase.from('customers').select('*').eq('company_id', companyId).limit(4),
                    
                    // Contagem total de clientes da empresa deste funcionário
                    supabase.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
                    
                    // Chamados abertos/pendentes atribuídos a este funcionário
                    supabase.from('service_requests')
                        .select('*', { count: 'exact', head: true })
                        .eq('company_id', companyId)
                        .eq('piscineiro_id', profileId)
                        .in('status', ['pendente', 'Pendente', 'em_execucao', 'Em Execução', 'agendado', 'Agendado']),

                    // Lista de chamados para o funcionário (filtrado apenas para os criados HOJE)
                    supabase.from('service_requests')
                        .select('*, customers(*), service_types(name)')
                        .eq('company_id', companyId)
                        .eq('piscineiro_id', profileId)
                        .in('status', ['pendente', 'Pendente', 'em_execucao', 'Em Execução', 'Confirmada', 'agendado', 'Agendado'])
                        .gte('created_at', todayStr)
                        .order('created_at', { ascending: false })
                        .limit(5)
                ]);

                setStats({
                    activeCustomers: customersCountRes.count || 0, // Contagem total real da empresa
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
        <div className="min-h-screen bg-background">
            {/* Header */}
            <header className="gradient-hero px-6 pt-6 pb-10 text-primary-foreground">
                <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <Droplets className="h-6 w-6 text-primary" />
                            <span className="font-bold text-lg">Pool Light</span>
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
            <main className="max-w-4xl mx-auto px-6 -mt-6">
                {/* Weather Card */}
                <div className="mb-4 animate-slide-up bg-primary/20 backdrop-blur-sm rounded-xl p-4 border border-primary/30">
                    {weatherLoading ? (
                        <div className="flex items-center gap-3 text-primary-foreground">
                            <span className="text-sm animate-pulse">Carregando clima...</span>
                        </div>
                    ) : weather ? (
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">{weather.icon}</span>
                            <div>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-2xl font-bold text-card-foreground">{weather.temperature}°C</span>
                                    <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{weather.city}</span>
                                </div>
                                <p className="text-xs text-muted-foreground">{weather.description}</p>
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-3 mb-8 animate-slide-up" style={{ animationDelay: "0.1s" }}>
                    <div className="bg-card rounded-xl p-4 shadow-sm border border-border text-center">
                        <div className="flex justify-center text-primary mb-1"><Users className="h-4 w-4" /></div>
                        <p className="text-xl font-bold text-card-foreground">{dataLoading ? '...' : stats.activeCustomers}</p>
                        <p className="text-xs text-muted-foreground">Clientes atribuídos</p>
                    </div>
                    <div className="bg-card rounded-xl p-4 shadow-sm border border-border text-center">
                        <div className="flex justify-center text-warning mb-1"><AlertCircle className="h-4 w-4" /></div>
                        <p className="text-xl font-bold text-card-foreground">{dataLoading ? '...' : stats.pendingTickets}</p>
                        <p className="text-xs text-muted-foreground">Chamados abertos</p>
                    </div>
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

                {/* Chamados Section */}
                <section className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Chamados</h2>
                        <span onClick={() => router.push('/chamados')} className="text-xs text-primary font-medium cursor-pointer hover:underline">Ver todos</span>
                    </div>
                    <div className="space-y-3">
                        {dataLoading ? (
                            <div className="space-y-3 animate-pulse">
                                <div className="bg-card h-24 rounded-xl border border-border"></div>
                                <div className="bg-card h-24 rounded-xl border border-border"></div>
                            </div>
                        ) : upcomingVisits.length > 0 ? (
                            upcomingVisits.map((visit) => {
                                let timeString = '--:--';
                                if (visit.scheduled_date) {
                                    const visitDate = new Date(visit.scheduled_date);
                                    timeString = visitDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                }
                                return (
                                    <ChamadoCard
                                        key={visit.id}
                                        title={visit.service_types?.name || 'Serviço'}
                                        client={visit.customers?.name || 'Cliente Desconhecido'}
                                        address={visit.customers?.address || 'Sem endereço'}
                                        time={timeString}
                                        onClick={() => router.push(`/chamados/${visit.id}`)}
                                    />
                                );
                            })
                        ) : (
                            <div className="bg-card rounded-xl p-6 text-center border border-border mt-4">
                                <p className="text-muted-foreground font-medium text-sm">Nenhum chamado pendente para hoje.</p>
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
    );
}
