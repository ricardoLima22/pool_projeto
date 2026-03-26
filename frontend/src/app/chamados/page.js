// src/app/chamados/page.js
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Plus, Droplets, User, CalendarDays, Trash2, Wrench, ChevronRight } from 'lucide-react';
import SplashScreen from '../../components/SplashScreen';

export default function ListagemChamados() {
    const [chamados, setChamados] = useState([]);
    const [busca, setBusca] = useState('');
    const [filtroStatus, setFiltroStatus] = useState("TODOS");
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('');
    const router = useRouter();

    useEffect(() => {
        const role = localStorage.getItem('user_role');
        if (role) setUserRole(role.toLowerCase());

        // Sincroniza a cor da barra de status do iOS
        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (metaTheme) metaTheme.setAttribute('content', '#1e40af');
        
        document.documentElement.style.backgroundColor = '#1e40af';
        document.body.style.backgroundColor = '#1e40af';

        fetchChamados(role?.toLowerCase());

        return () => {
            const metaTheme = document.querySelector('meta[name="theme-color"]');
            if (metaTheme) metaTheme.setAttribute('content', '#ffffff');
            
            document.documentElement.style.backgroundColor = '#fcfbf8';
            document.body.style.backgroundColor = '#fcfbf8';
        };
    }, []);

    async function fetchChamados(role) {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user.id)
                .single();

            if (profile?.company_id) {
                let query = supabase
                    .from('service_requests')
                    .select('*, customers(name), profiles!piscineiro_id(full_name), service_types(name)')
                    .eq('company_id', profile.company_id);

                if (role === 'funcionario') {
                    query = query.eq('piscineiro_id', user.id);
                }

                const { data, error } = await query.order('created_at', { ascending: false });

                if (error) {
                    console.error("Erro ao buscar chamados:", error);
                } else {
                    setChamados(data || []);
                }
            }
        }
        setLoading(false);
    }

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm("Tem certeza que deseja excluir este chamado?")) return;
        
        await supabase.from('service_requests').delete().eq('id', id);
        fetchChamados();
    };

    const chamadosFiltrados = chamados.filter(c => {
        const term = busca.toLowerCase();
        const matchBusca = 
            c.customers?.name?.toLowerCase().includes(term) || 
            c.service_types?.name?.toLowerCase().includes(term) ||
            c.description?.toLowerCase().includes(term);
        
        let matchStatus = true;
        if (filtroStatus === "PENDENTE") {
            matchStatus = c.status?.toLowerCase() === 'pendente';
        } else if (filtroStatus === "CONCLUÍDO") {
            matchStatus = c.status?.toLowerCase() === 'concluido';
        }

        return matchBusca && matchStatus;
    });

    const pendentes = chamados.filter(c => c.status?.toLowerCase() === 'pendente').length;
    const concluidos = chamados.filter(c => c.status?.toLowerCase() === 'concluido').length;

    const navTabs = ["TODOS", "PENDENTE", "CONCLUÍDO"];

    if (loading) {
        return <SplashScreen message="Carregando chamados..." />;
    }

    return (
        <div className="min-h-screen flex flex-col">
            {/* Header */}
            <header
                className="px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-8 rounded-b-3xl"
                style={{ background: "linear-gradient(135deg, hsl(225 75% 48%), hsl(225 85% 60%))" }}
            >
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.push("/home")} className="text-white/80 hover:text-white transition-colors">
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <div>
                            <h1 className="text-xl font-bold text-white">Meus Chamados</h1>
                            <p className="text-white/60 text-xs mt-0.5">Gerencie seus serviços</p>
                        </div>
                    </div>
                    {userRole !== 'funcionario' && (
                        <button
                            onClick={() => router.push('/chamados/novo')}
                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors"
                        >
                            <Plus className="h-4 w-4" />
                            Novo
                        </button>
                    )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                    <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-3 text-center">
                        <p className="text-2xl font-bold text-white">{chamados.length}</p>
                        <p className="text-[10px] text-white/70 font-medium uppercase tracking-wider">Total</p>
                    </div>
                    <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-3 text-center">
                        <p className="text-2xl font-bold text-amber-300">{pendentes}</p>
                        <p className="text-[10px] text-white/70 font-medium uppercase tracking-wider">Pendentes</p>
                    </div>
                    <div className="bg-white/15 backdrop-blur-sm rounded-xl px-3 py-3 text-center">
                        <p className="text-2xl font-bold text-emerald-300">{concluidos}</p>
                        <p className="text-[10px] text-white/70 font-medium uppercase tracking-wider">Concluídos</p>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                    <input
                        type="text"
                        placeholder="Buscar chamado..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/15 backdrop-blur-sm text-sm text-white placeholder:text-white/40 focus:outline-none focus:bg-white/25 transition-colors border border-white/10"
                    />
                </div>
            </header>

            <div className="flex-1 bg-[#fcfbf8] pb-24">
            {/* Filter Tabs */}
            <div className="px-5 -mt-3">
                <div className="bg-white rounded-xl border border-slate-200 p-1 flex gap-1 shadow-sm">
                    {navTabs.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setFiltroStatus(tab)}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                                filtroStatus === tab
                                    ? "text-white shadow-md"
                                    : "text-slate-500 hover:text-slate-800"
                            }`}
                            style={filtroStatus === tab ? { background: "hsl(225 75% 52%)" } : {}}
                        >
                            {tab === "TODOS" ? "Todos" : tab === "PENDENTE" ? "Pendentes" : "Concluídos"}
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="px-5 py-4 space-y-3 pb-20">
                <>
                    {chamadosFiltrados.map((chamado) => {
                            const isPendente = chamado.status?.toLowerCase() === 'pendente';
                            return (
                                <div
                                    key={chamado.id}
                                    onClick={() => router.push(`/chamados/${chamado.id}`)}
                                    className="bg-white cursor-pointer rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow active:scale-[0.99]"
                                >
                                    {/* Card top accent */}
                                    <div
                                        className="h-1"
                                        style={{
                                            background: isPendente
                                                ? "linear-gradient(90deg, hsl(40 90% 55%), hsl(30 90% 55%))"
                                                : "linear-gradient(90deg, hsl(152 70% 45%), hsl(160 70% 40%))",
                                        }}
                                    />

                                    <div className="p-4">
                                        {/* Top row */}
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                                    style={{ background: "hsl(225 75% 52% / 0.1)" }}
                                                >
                                                    {chamado.service_types?.name?.toLowerCase().includes("limpeza") ? (
                                                        <Droplets className="h-5 w-5" style={{ color: "hsl(225 75% 52%)" }} />
                                                    ) : (
                                                        <Wrench className="h-5 w-5" style={{ color: "hsl(225 75% 52%)" }} />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 text-[15px]">{chamado.customers?.name || 'Cliente Removido'}</p>
                                                    <p className="text-xs font-semibold" style={{ color: "hsl(225 75% 52%)" }}>
                                                        {chamado.service_types?.name || 'Serviço Padrão'}
                                                    </p>
                                                </div>
                                            </div>
                                            <span
                                                className={`text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-lg uppercase whitespace-nowrap ${
                                                    isPendente
                                                        ? "bg-amber-100 text-amber-700"
                                                        : chamado.status?.toLowerCase() === 'cancelado' 
                                                            ? "bg-red-100 text-red-700"
                                                            : "bg-emerald-100 text-emerald-700"
                                                }`}
                                            >
                                                {chamado.status}
                                            </span>
                                        </div>

                                        {/* Description */}
                                        <div className="bg-slate-50/80 rounded-xl px-3 py-2.5 mb-3">
                                            <p className="text-sm text-slate-500 whitespace-pre-wrap line-clamp-2">
                                                {chamado.description || 'Nenhuma descrição fornecida.'}
                                            </p>
                                        </div>

                                        {/* Bottom row */}
                                        <div className="flex items-center justify-between mt-1">
                                            <div className="flex items-center gap-4">
                                                <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                                                    <User className="h-3.5 w-3.5" style={{ color: "hsl(225 75% 52%)" }} />
                                                    {chamado.profiles?.full_name?.split(' ')[0] || 'N/A'}
                                                </p>
                                                <p className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                                                    <CalendarDays className="h-3.5 w-3.5" style={{ color: "hsl(225 75% 52%)" }} />
                                                    {chamado.scheduled_date ? new Date(chamado.scheduled_date).toLocaleDateString() : '--/--/----'}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                {userRole !== 'funcionario' && (
                                                    <button 
                                                        onClick={(e) => handleDelete(chamado.id, e)}
                                                        className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        router.push(`/chamados/${chamado.id}`);
                                                    }}
                                                    className="flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-xl text-white transition-colors"
                                                    style={{ background: "hsl(225 75% 52%)" }}
                                                >
                                                    Detalhes
                                                    <ChevronRight className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {chamadosFiltrados.length === 0 && (
                            <div className="text-center py-12">
                                <Droplets className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                                <p className="text-slate-500 text-sm font-medium">Nenhum chamado encontrado nesta categoria.</p>
                            </div>
                        )}
                </>
            </div>
            </div>
        </div>
    );
}
