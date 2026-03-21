'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { useWeather } from '../../hooks/useWeather';
import { Droplets, LogOut, Camera, Users, UserPlus, Package, PlusCircle, BarChart3, Calendar, MapPin, Clock, TrendingUp, Waves, Thermometer } from "lucide-react";

const StatCard = ({ icon, value, label }) => (
  <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 text-center hover:shadow-md transition-all">
    <div className="flex justify-center text-blue-500 mb-2">{icon}</div>
    <p className="text-2xl font-black text-slate-800 tracking-tight">{value}</p>
    <p className="text-xs text-slate-500 font-medium mt-1">{label}</p>
  </div>
);

const QuickCard = ({ icon, title, subtitle, onClick }) => (
  <button onClick={onClick} className="bg-white w-full rounded-xl p-5 shadow-sm border border-slate-100 text-left hover:shadow-md hover:border-blue-200 transition-all group active:scale-[0.98]">
    <div className="mb-3 group-hover:scale-110 transition-transform inline-block bg-slate-50 p-2 rounded-lg">{icon}</div>
    <p className="font-bold text-slate-800">{title}</p>
    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-1">{subtitle}</p>
  </button>
);

const VisitCard = ({ name, address, time, status }) => (
  <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
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
      <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700">
        <Clock className="h-3.5 w-3.5 text-slate-400" />
        {time}
      </div>
      <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${
        status?.toLowerCase() === "concluido" ? "bg-emerald-100 text-emerald-700" : 
        status?.toLowerCase() === "em_execucao" ? "bg-blue-100 text-blue-700" : 
        "bg-amber-100 text-amber-700"}`}>
        {status === 'em_execucao' ? 'Em Execução' : status === 'concluido' ? 'Concluído' : status || 'Pendente'}
      </span>
    </div>
  </div>
);

export default function Dashboard() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    
    // Métricas reais do Supabase
    const [stats, setStats] = useState({ visitsToday: 0, activeCustomers: 0 });
    const [upcomingVisits, setUpcomingVisits] = useState([]);

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
                .select('full_name, company_id, role_id, roles(name)')
                .eq('id', user.id)
                .single();

            if (userProfile) {
                const roleName = Array.isArray(userProfile.roles) 
                    ? userProfile.roles[0]?.name 
                    : userProfile.roles?.name;
                    
                if (roleName?.toLowerCase() === 'funcionario') {
                    await supabase.auth.signOut();
                    router.push('/login?erro=funcionario');
                    return;
                }

                localStorage.setItem("company_id", userProfile.company_id);
                localStorage.setItem("role_id", userProfile.role_id);
                localStorage.setItem("user_role", roleName);
                    
                setProfile({ ...userProfile, roleName });
                
                // LÓGICA DE DADOS DINÂMICOS
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                
                // 1. Clientes Ativos
                const { count: customersCount } = await supabase
                    .from('customers')
                    .select('*', { count: 'exact', head: true })
                    .eq('company_id', userProfile.company_id);

                // 2. Visitas Hoje (service_requests agendados para a data de hoje)
                const { count: visitsTodayCount } = await supabase
                    .from('service_requests')
                    .select('*', { count: 'exact', head: true })
                    .eq('company_id', userProfile.company_id)
                    .gte('scheduled_date', today.toISOString())
                    .lt('scheduled_date', tomorrow.toISOString());

                // 3. Próximas Visitas (Chamados futuros ou de hoje com status pendente/execução)
                const { data: upcoming } = await supabase
                    .from('service_requests')
                    .select('id, scheduled_date, status, customers(name, address)')
                    .eq('company_id', userProfile.company_id)
                    .in('status', ['pendente', 'em_execucao'])
                    .gte('scheduled_date', today.toISOString())
                    .order('scheduled_date', { ascending: true })
                    .limit(3);

                setStats({
                    activeCustomers: customersCount || 0,
                    visitsToday: visitsTodayCount || 0
                });
                
                setUpcomingVisits(upcoming || []);
            }
            setLoading(false);
        }

        fetchUserAndData();
    }, [router]);

    const handleLogout = async () => {
        localStorage.removeItem('company_id');
        localStorage.removeItem('role_id');
        localStorage.removeItem('user_role');
        supabase.auth.signOut().catch(console.error);
        router.push('/login');
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-slate-500 font-bold uppercase tracking-widest text-sm">Carregando painel...</p>
                </div>
            </main>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20 font-sans">
            {/* Header com CSS Gradient Customizado */}
            <header className="gradient-hero px-6 pt-10 pb-16 text-white shadow-xl shadow-cyan-900/10 rounded-b-[30px] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="max-w-4xl mx-auto relative z-10">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2">
                            <Droplets className="h-7 w-7 text-cyan-200" />
                            <span className="font-black tracking-tight text-xl">Pool Light</span>
                        </div>
                        <button onClick={handleLogout} className="flex items-center gap-2 text-sm bg-white/10 hover:bg-white/20 px-4 py-2 text-white font-bold rounded-xl backdrop-blur-md transition-all active:scale-95 border border-white/10">
                            <LogOut className="h-4 w-4" />
                            Sair
                        </button>
                    </div>
                    <div>
                        <h1 className="text-3xl font-black animate-fade-in tracking-tight drop-shadow-sm">{greeting}, {profile?.full_name?.split(' ')[0] || 'Usuário'}!</h1>
                        <p className="text-cyan-100 font-medium opacity-90 mt-1.5 text-sm">O que vamos fazer hoje?</p>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-4xl mx-auto px-5 -mt-8 relative z-20">
                {/* Weather Card */}
                <div className="mb-6 animate-slide-up bg-white/40 backdrop-blur-2xl rounded-[24px] p-5 border border-white/60 shadow-lg shadow-blue-900/5">
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
                    <StatCard icon={<Calendar className="h-6 w-6" />} value={stats.visitsToday.toString()} label="Visitas hoje" />
                    <StatCard icon={<Users className="h-6 w-6" />} value={stats.activeCustomers.toString()} label="Clientes ativos" />
                    <StatCard icon={<TrendingUp className="h-6 w-6 text-emerald-500" />} value="R$ --" label="Em breve" />
                </div>

                {/* Register Visit CTA */}
                <div className="animate-slide-up mb-10" style={{ animationDelay: "0.2s" }}>
                    <button onClick={() => router.push('/visita/nova')} className="w-full gradient-success text-white rounded-[24px] p-6 text-left shadow-xl shadow-emerald-200/50 hover:shadow-2xl hover:-translate-y-1 transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl -mr-10 -mt-10 group-active:scale-110 transition-transform"></div>
                        <div className="flex items-center justify-between relative z-10">
                            <div>
                                <p className="text-2xl font-black tracking-tight mb-1">Registrar Visita</p>
                                <p className="text-emerald-50 text-sm font-medium">Fotos, medições e cobrança</p>
                            </div>
                            <div className="bg-white/20 rounded-full p-4 shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-all backdrop-blur-sm">
                                <Camera className="h-7 w-7 text-white" />
                            </div>
                        </div>
                    </button>
                </div>

                {/* Quick Access */}
                <section className="mb-10 animate-slide-up" style={{ animationDelay: "0.3s" }}>
                    <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 ml-1">Acesso Rápido</h2>
                    <div className="grid grid-cols-2 gap-3">
                        <QuickCard onClick={() => router.push('/clientes')} icon={<Users className="h-6 w-6 text-indigo-500" />} title="Meus Clientes" subtitle="Sua carteira" />
                        <QuickCard onClick={() => router.push('/clientes/novo')} icon={<UserPlus className="h-6 w-6 text-emerald-500" />} title="Novo Cliente" subtitle="Cadastrar" />
                        <QuickCard onClick={() => router.push('/chamados')} icon={<Calendar className="h-6 w-6 text-indigo-500" />} title="Meus Chamados" subtitle="Agendamentos" />
                        <QuickCard onClick={() => router.push('/chamados/novo')} icon={<PlusCircle className="h-6 w-6 text-emerald-500" />} title="Novo Chamado" subtitle="Gerar serviço" />
                    </div>
                </section>

                {/* Upcoming Visits */}
                <section className="animate-slide-up" style={{ animationDelay: "0.4s" }}>
                    <div className="flex justify-between items-center mb-4 ml-1">
                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Próximas Visitas</h2>
                    </div>
                    <div className="space-y-3">
                        {upcomingVisits.length > 0 ? (
                            upcomingVisits.map((visit) => {
                                const visitDate = new Date(visit.scheduled_date);
                                const timeString = visitDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                                return (
                                    <VisitCard 
                                        key={visit.id}
                                        name={visit.customers?.name || 'Cliente Desconhecido'} 
                                        address={visit.customers?.address || ''} 
                                        time={timeString} 
                                        status={visit.status} 
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
                <div className="mt-10 gradient-dark rounded-[24px] p-6 text-white animate-slide-up shadow-xl shadow-slate-900/10 relative overflow-hidden" style={{ animationDelay: "0.5s" }}>
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <div className="flex items-start gap-4 relative z-10">
                        <div className="bg-blue-500/20 rounded-xl p-3 mt-1 backdrop-blur-sm border border-blue-400/20">
                            <BarChart3 className="h-6 w-6 text-blue-300" />
                        </div>
                        <div>
                            <p className="font-black text-lg tracking-tight drop-shadow-sm">Seu negócio está crescendo! 📈</p>
                            <p className="text-slate-300 text-sm mt-1.5 leading-relaxed font-medium">Mantenha seu estoque atualizado para gerar relatórios precisos.</p>
                            <div className="inline-block mt-4 bg-white/10 border border-white/10 text-white px-3 py-1.5 rounded-full backdrop-blur-md">
                                <span className="text-[10px] font-black tracking-widest uppercase opacity-90">Em breve: Relatórios</span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};
