'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { useWeather } from '../../hooks/useWeather';
import { Droplets, LogOut, Camera, Users, UserPlus, Package, PlusCircle, BarChart3, Calendar, MapPin, Clock, TrendingUp, Waves, Thermometer } from "lucide-react";
import SplashScreen from '../../components/SplashScreen';

const StatCard = ({ icon, value, label }) => (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 text-center">
        <div className="flex justify-center text-cyan-600 mb-1">{icon}</div>
        <p className="text-xl font-bold text-slate-800">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
    </div>
);

const QuickCard = ({ icon, title, subtitle, onClick }) => (
    <button onClick={onClick} className="bg-white w-full rounded-xl p-4 shadow-sm border border-slate-200 text-left hover:shadow-md hover:border-cyan-200 transition-all group">
        <div className="mb-2 group-hover:scale-110 transition-transform inline-block">{icon}</div>
        <p className="font-bold text-slate-800">{title}</p>
        <p className="text-xs text-slate-500 mt-1 font-medium">{subtitle}</p>
    </button>
);

const VisitCard = ({ id, name, address, time, status, onClick }) => (
    <button onClick={onClick} className="w-full text-left bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md hover:border-blue-200 transition-all active:scale-[0.98]">
        <div className="bg-cyan-50 rounded-full p-3 border border-cyan-100">
            <Waves className="h-5 w-5 text-cyan-600" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 truncate">{name}</p>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                <MapPin className="h-3 w-3 shrink-0 text-slate-400" />
                <span className="truncate">{address || 'Endereço não cadastrado'}</span>
            </div>
        </div>
        <div className="text-right shrink-0 flex flex-col justify-between items-end gap-1">
            <div className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                {time}
            </div>
            <span className={`text-[11px] font-bold ${["concluido", "concluído", "confirmada", "em_execucao"].includes(status?.toLowerCase())
                ? "text-emerald-500"
                : "text-amber-500"
                }`}>
                {status?.toLowerCase() === 'em_execucao' ? 'Em Execução' : status?.charAt(0).toUpperCase() + status?.slice(1).toLowerCase() || 'Pendente'}
            </span>
        </div>
    </button>
);

export default function Dashboard() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Métricas reais do Supabase
    const [stats, setStats] = useState({ visitsToday: null, activeCustomers: null });
    const [upcomingVisits, setUpcomingVisits] = useState([]);
    const [dataLoading, setDataLoading] = useState(true);

    const currentHour = new Date().getHours();
    const greeting = currentHour < 12 ? "Bom dia" : currentHour < 18 ? "Boa tarde" : "Boa noite";
    const { weather, loading: weatherLoading } = useWeather();

    useEffect(() => {
        async function fetchUserAndData() {
            // iOS Safari Notch Sync
            const metaTheme = document.querySelector('meta[name="theme-color"]');
            if (metaTheme) metaTheme.setAttribute('content', '#122b3a');

            document.documentElement.style.backgroundColor = '#122b3a';
            document.body.style.backgroundColor = '#122b3a';

            setLoading(true);
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                router.push('/login');
                return;
            }

            const { data: userProfile } = await supabase
                .from('profiles')
                .select('full_name, company_id, role_id, roles(name)')
                .eq('id', user.id)
                .single();

            if (userProfile && userProfile.company_id) {
                const roleName = Array.isArray(userProfile.roles)
                    ? userProfile.roles[0]?.name
                    : userProfile.roles?.name;

                if (roleName?.toLowerCase() === 'funcionario') {
                    router.push('/funcionario');
                    return;
                }

                localStorage.setItem("company_id", userProfile.company_id);
                localStorage.setItem("role_id", userProfile.role_id);
                localStorage.setItem("user_role", roleName);

                setProfile({ ...userProfile, roleName });
                setLoading(false); // Libera a tela imediatamente

                // Busca dados em background
                fetchMetrics(userProfile.company_id);
            } else {
                // Sessão fantasma ou não vinculada a empresa
                await supabase.auth.signOut();
                router.push('/login?erro=sem_empresa');
            }
        }

        async function fetchMetrics(companyId) {
            setDataLoading(true);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const todayStr = today.toISOString().split('T')[0];
            const tomorrowStr = tomorrow.toISOString().split('T')[0];

            try {
                const [customersRes, visitsRes, upcomingRes] = await Promise.all([
                    supabase.from('customers').select('*', { count: 'exact', head: true }).eq('company_id', companyId),
                    supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('company_id', companyId).gte('scheduled_date', todayStr).lt('scheduled_date', tomorrowStr),
                    supabase.from('service_requests').select('*, customers!inner(*)').eq('company_id', companyId).in('status', ['pendente', 'Pendente', 'em_execucao', 'Em Execução', 'Confirmada', 'confirmada']).gte('scheduled_date', todayStr).order('scheduled_date', { ascending: true }).limit(5)
                ]);

                setStats({
                    activeCustomers: customersRes.count || 0,
                    visitsToday: visitsRes.count || 0
                });
                setUpcomingVisits(upcomingRes.data || []);
            } catch (error) {
                console.error("Erro ao buscar métricas", error);
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
        supabase.auth.signOut().catch(console.error);
        router.push('/login');
    };

    if (loading) {
        return <SplashScreen message="Carregando painel..." />;
    }

    return (
        <div className="min-h-screen font-sans flex flex-col">
            {/* Header Expandido com Espaço no Meio para usos futuros */}
            <header className="gradient-hero px-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-12 text-white shadow-md min-h-[180px] flex flex-col">
                <div className="max-w-4xl mx-auto w-full h-full flex-1 flex flex-col">
                    
                    {/* Cantos Superiores */}
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <Droplets className="h-6 w-6 text-cyan-200" />
                            <span className="font-bold tracking-tight text-lg">Pool Light</span>
                        </div>
                        <button onClick={handleLogout} className="flex items-center gap-2 text-sm opacity-80 hover:opacity-100 transition-opacity">
                            <LogOut className="h-4 w-4" />
                            Sair
                        </button>
                    </div>
                    
                    {/* Canto Inferior Esquerdo (empurrado pelo mt-auto) */}
                    <div className="mt-auto">
                        <h1 className="text-2xl font-bold animate-fade-in">O que vamos fazer hoje?</h1>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 bg-slate-50 pb-24">
                <main className="max-w-4xl mx-auto px-5 -mt-8 relative z-20">
                    {/* Weather Card */}
                    <div className="mb-4 animate-slide-up bg-white/40 backdrop-blur-sm rounded-xl p-4 border border-cyan-100 shadow-sm">
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
                                            <span className="text-3xl font-black text-slate-800 tracking-tighter">{weather.temperature}°C</span>
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-200/50 px-2 py-0.5 rounded-md">{weather.city}</span>
                                        </div>
                                        <p className="text-[11px] font-bold text-slate-400 mt-1">{weather.description} • Tempo agora na sua região</p>
                                    </div>
                                </div>
                            </div>
                        ) : null}
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-3 mb-8 animate-slide-up" style={{ animationDelay: "0.1s" }}>
                        <StatCard icon={<Calendar className="h-6 w-6" />} value={stats.visitsToday !== null ? stats.visitsToday : '...'} label="Visitas hoje" />
                        <StatCard icon={<Users className="h-6 w-6" />} value={stats.activeCustomers !== null ? stats.activeCustomers : '...'} label="Clientes ativos" />
                        <StatCard icon={<TrendingUp className="h-6 w-6 text-emerald-500" />} value="R$ --" label="Em breve" />
                    </div>

                    {/* Register Visit CTA */}
                    <div className="animate-slide-up mb-8" style={{ animationDelay: "0.2s" }}>
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

                    {/* Quick Access */}
                    <section className="mb-8 animate-slide-up" style={{ animationDelay: "0.3s" }}>
                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Acesso Rápido</h2>
                        <div className="grid grid-cols-2 gap-3">
                            <QuickCard onClick={() => router.push('/clientes')} icon={<Users className="h-5 w-5 text-blue-500" />} title="Meus Clientes" subtitle="Sua carteira" />
                            <QuickCard onClick={() => router.push('/clientes/novo')} icon={<UserPlus className="h-5 w-5 text-emerald-500" />} title="Novo Cliente" subtitle="Cadastrar" />
                            <QuickCard onClick={() => router.push('/produtos')} icon={<Package className="h-5 w-5 text-blue-500" />} title="Meus Produtos" subtitle="Seu estoque" />
                            <QuickCard onClick={() => router.push('/produtos/novo')} icon={<PlusCircle className="h-5 w-5 text-emerald-500" />} title="Novo Produto" subtitle="Cadastrar" />
                            <QuickCard onClick={() => router.push('/chamados')} icon={<Calendar className="h-5 w-5 text-blue-500" />} title="Meus Chamados" subtitle="Agendamentos" />
                            <QuickCard onClick={() => router.push('/chamados/novo')} icon={<PlusCircle className="h-5 w-5 text-emerald-500" />} title="Novo Chamado" subtitle="Gerar serviço" />
                        </div>
                    </section>

                    {/* Upcoming Visits */}
                    <section className="mb-8 animate-slide-up" style={{ animationDelay: "0.4s" }}>
                        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Próximas Visitas</h2>
                        <div className="space-y-3">
                            {dataLoading ? (
                                <div className="bg-white rounded-[20px] p-6 text-center border border-slate-100 shadow-sm animate-pulse">
                                    <div className="bg-slate-100 w-full h-12 rounded-lg mb-2"></div>
                                    <div className="bg-slate-100 w-full h-12 rounded-lg mb-2"></div>
                                </div>
                            ) : upcomingVisits.length > 0 ? (
                                upcomingVisits.map((visit) => {
                                    const visitDate = new Date(visit.scheduled_date);
                                    const timeString = visitDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                    return (
                                        <VisitCard
                                            key={visit.id}
                                            id={visit.id}
                                            name={visit.customers?.name || 'Cliente Desconhecido'}
                                            address={visit.customers?.address || ''}
                                            time={timeString}
                                            status={visit.status}
                                            onClick={() => router.push(`/chamados/${visit.id}`)}
                                        />
                                    );
                                })
                            ) : (
                                <div className="bg-white rounded-[20px] p-8 text-center border border-slate-100 shadow-sm">
                                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Calendar className="h-8 w-8 text-slate-300" />
                                    </div>
                                    <p className="text-slate-800 font-bold">Agenda Livre!</p>
                                    <p className="text-slate-400 text-sm font-medium mt-1">Nenhuma visita confirmada para as próximas horas.</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Bottom Banner */}
                    <div className="mt-8 mb-8 gradient-dark rounded-xl p-5 text-slate-200 animate-slide-up" style={{ animationDelay: "0.5s" }}>
                        <div className="flex items-start gap-3">
                            <div className="bg-cyan-900/50 rounded-lg p-2 mt-0.5">
                                <BarChart3 className="h-5 w-5 text-cyan-400" />
                            </div>
                            <div>
                                <p className="font-bold text-white">Seu negócio está crescendo! 📈</p>
                                <p className="text-sm opacity-75 mt-1">Mantenha seu estoque atualizado para gerar relatórios precisos.</p>
                                <span className="inline-block mt-3 text-xs bg-cyan-900/50 text-cyan-300 px-3 py-1 rounded-full font-medium">
                                    Em breve: Relatórios
                                </span>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};
