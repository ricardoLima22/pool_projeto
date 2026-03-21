// src/app/chamados/page.js
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function ListagemChamados() {
    const [chamados, setChamados] = useState([]);
    const [busca, setBusca] = useState('');
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        fetchChamados();
    }, []);

    async function fetchChamados() {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user.id)
                .single();

            if (profile?.company_id) {
                // Busca os chamados com os relacionamentos
                const { data, error } = await supabase
                    .from('service_requests')
                    .select('*, customers(name), profiles!piscineiro_id(full_name), service_types(name)')
                    .eq('company_id', profile.company_id)
                    .order('created_at', { ascending: false });

                if (error) {
                    console.error("Erro ao buscar chamados:", error);
                } else {
                    setChamados(data || []);
                }
            }
        }
        setLoading(false);
    }

    const handleDelete = async (id) => {
        if (!window.confirm("Tem certeza que deseja excluir este chamado?")) return;
        
        await supabase.from('service_requests').delete().eq('id', id);
        fetchChamados(); // recarrega a lista
    };

    // Filtro pelo nome do cliente ou da descrição
    const chamadosFiltrados = chamados.filter(c => {
        const term = busca.toLowerCase();
        return c.customers?.name?.toLowerCase().includes(term) || 
               c.description?.toLowerCase().includes(term);
    });

    const formatStatus = (status) => {
        switch(status?.toLowerCase()) {
            case 'pendente': return 'bg-yellow-100 text-yellow-700';
            case 'concluído':
            case 'concluido': return 'bg-emerald-100 text-emerald-700';
            case 'em andamento': return 'bg-blue-100 text-blue-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    return (
        <main className="min-h-screen bg-slate-50 p-4">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => router.push('/home')} className="text-slate-500 text-2xl">←</button>
                <h1 className="text-xl font-black text-slate-800 flex-1">Chamados</h1>
                <div className="flex gap-2">
                    <button
                        onClick={() => router.push('/chamados/novo')}
                        className="bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded-xl shadow-md hover:bg-blue-700 transition flex items-center gap-1"
                    >
                        Novo ➕
                    </button>
                </div>
            </div>

            <div className="sticky top-0 bg-slate-50 pb-4 z-10">
                <input
                    type="text"
                    placeholder="🔍 Buscar por cliente ou descrição..."
                    className="w-full p-4 rounded-2xl border-none shadow-sm focus:ring-2 ring-blue-500"
                    onChange={(e) => setBusca(e.target.value)}
                />
            </div>

            {loading ? (
                <p className="text-center py-10 text-slate-400 animate-pulse">Carregando chamados...</p>
            ) : (
                <div className="space-y-4">
                    {chamadosFiltrados.map(chamado => (
                        <div key={chamado.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm transition-all flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="font-bold text-slate-800 text-lg">{chamado.customers?.name || 'Cliente Removido'}</h2>
                                    <p className="text-blue-600 font-semibold text-sm">
                                        🛠️ {chamado.service_types?.name || 'Serviço Padrão'}
                                    </p>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${formatStatus(chamado.status)}`}>
                                    {chamado.status || 'Pendente'}
                                </span>
                            </div>
                            
                            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                <p className="text-slate-600 text-sm whitespace-pre-wrap">{chamado.description || 'Sem descrição.'}</p>
                            </div>

                            <div className="flex justify-between items-center mt-1">
                                <div className="text-xs font-medium text-slate-500">
                                    <p>👷 Resp: {chamado.profiles?.full_name || 'Não atribuído'}</p>
                                    <p>📅 Agendado para: {chamado.scheduled_date ? new Date(chamado.scheduled_date).toLocaleDateString() : 'N/A'}</p>
                                </div>
                                
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => router.push(`/chamados/${chamado.id}/editar`)}
                                        className="text-slate-400 hover:text-blue-500 bg-slate-100 p-2 rounded-lg transition-colors"
                                        title="Editar"
                                    >
                                        ✏️
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(chamado.id)}
                                        className="text-slate-400 hover:text-red-500 bg-red-50 p-2 rounded-lg transition-colors"
                                        title="Excluir"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {chamadosFiltrados.length === 0 && (
                        <div className="text-center py-10">
                            <p className="text-slate-400">Nenhum chamado encontrado.</p>
                        </div>
                    )}
                </div>
            )}
        </main>
    );
}
