// src/app/chamados/[id]/page.js
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useParams, useRouter } from 'next/navigation';

export default function DetalhesChamado() {
    const [chamado, setChamado] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editando, setEditando] = useState(false);
    
    // Campos editáveis
    const [status, setStatus] = useState('');
    const [description, setDescription] = useState('');
    const [scheduledDate, setScheduledDate] = useState('');
    const [salvando, setSalvando] = useState(false);

    const params = useParams();
    const router = useRouter();
    const { id } = params;

    useEffect(() => {
        async function fetchChamado() {
            if (!id) return;
            const { data, error } = await supabase
                .from('service_requests')
                .select('*, customers(name), profiles!piscineiro_id(full_name), service_types(name)')
                .eq('id', id)
                .single();

            if (data) {
                setChamado(data);
                setStatus(data.status || 'Pendente');
                setDescription(data.description || '');
                setScheduledDate(data.scheduled_date ? data.scheduled_date.split('T')[0] : '');
            }
            setLoading(false);
        }
        fetchChamado();
    }, [id]);

    const handleDelete = async () => {
        if (confirm("Tem certeza que deseja excluir esse chamado? (Esta ação não pode ser desfeita)")) {
            setLoading(true);
            const { error } = await supabase.from('service_requests').delete().eq('id', id);
            if (!error) {
                router.push('/chamados');
            } else {
                alert("Erro ao excluir: " + error.message);
                setLoading(false);
            }
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setSalvando(true);
        const { error } = await supabase
            .from('service_requests')
            .update({
                status,
                description,
                scheduled_date: scheduledDate || null
            })
            .eq('id', id);

        if (!error) {
            setChamado({ ...chamado, status, description, scheduled_date: scheduledDate });
            setEditando(false);
        } else {
            alert("Erro ao atualizar: " + error.message);
        }
        setSalvando(false);
    };

    const formatStatusName = (st) => {
        if (!st) return 'Pendente';
        if (st.toLowerCase() === 'em_execucao') return 'Em Execução';
        return st.charAt(0).toUpperCase() + st.slice(1).toLowerCase();
    };

    const getStatusColor = (st) => {
        switch(st?.toLowerCase()) {
            case 'pendente': return 'text-amber-600 bg-amber-50';
            case 'concluido': 
            case 'concluído': 
            case 'confirmada': return 'text-emerald-600 bg-emerald-50';
            case 'em_execucao': return 'text-blue-600 bg-blue-50';
            case 'cancelado': return 'text-red-600 bg-red-50';
            default: return 'text-slate-600 bg-slate-50';
        }
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-slate-50 p-6 flex justify-center items-center">
                <p className="text-slate-400 animate-pulse font-bold text-lg">Carregando detalhes...</p>
            </main>
        );
    }

    if (!chamado) {
        return (
            <main className="min-h-screen bg-slate-50 p-6 flex flex-col justify-center items-center">
                <p className="text-slate-500 mb-4 text-lg">Chamado não encontrado.</p>
                <button onClick={() => router.back()} className="text-blue-500 font-bold px-4 py-2 bg-blue-50 rounded-lg">Voltar</button>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 p-4 pb-24">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => router.back()} className="text-slate-500 text-2xl">←</button>
                <h1 className="text-xl font-black text-slate-800">
                    {editando ? "Editar Chamado" : "Detalhes do Chamado"}
                </h1>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-6">
                {!editando ? (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xs font-bold text-slate-400 uppercase mb-1">Cliente</h2>
                            <p className="text-lg font-bold text-slate-800">{chamado.customers?.name || 'Cliente Removido'}</p>
                        </div>
                        <div>
                            <h2 className="text-xs font-bold text-slate-400 uppercase mb-1">Status</h2>
                            <p className={`text-sm font-bold inline-block px-3 py-1 rounded-xl uppercase tracking-wider ${getStatusColor(chamado.status)}`}>
                                {formatStatusName(chamado.status)}
                            </p>
                        </div>
                        <div>
                            <h2 className="text-xs font-bold text-slate-400 uppercase mb-1">Data Agendada</h2>
                            <p className="text-lg font-bold text-slate-800">
                                {chamado.scheduled_date ? new Date(chamado.scheduled_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Não agendado'}
                            </p>
                        </div>
                        <div>
                            <h2 className="text-xs font-bold text-slate-400 uppercase mb-1">Tipo de Serviço</h2>
                            <p className="text-lg font-bold text-slate-800">{chamado.service_types?.name || 'Serviço Padrão'}</p>
                        </div>
                        <div>
                            <h2 className="text-xs font-bold text-slate-400 uppercase mb-1">Responsável (Piscineiro)</h2>
                            <p className="text-lg font-bold text-slate-800">{chamado.profiles?.full_name || 'Não atribuído'}</p>
                        </div>
                        <div>
                            <h2 className="text-xs font-bold text-slate-400 uppercase mb-1">Descrição</h2>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <p className="text-slate-700 whitespace-pre-wrap">{chamado.description || 'Sem descrição cadastrada.'}</p>
                            </div>
                        </div>

                        <div className="pt-6 mt-4 border-t border-slate-100 flex gap-4">
                            <button
                                onClick={() => setEditando(true)}
                                className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-all text-sm uppercase"
                            >
                                Editar Chamado
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 bg-red-100 text-red-600 py-4 rounded-2xl font-bold active:scale-95 transition-all text-sm uppercase hover:bg-red-200"
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleUpdate} className="space-y-5 flex flex-col">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Cliente (Somente Leitura)</label>
                            <input
                                disabled type="text" value={chamado.customers?.name || 'N/A'}
                                className="w-full p-4 bg-slate-100 opacity-70 rounded-2xl border-none text-slate-500 cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Status</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 ring-blue-500 text-slate-700 font-medium"
                            >
                                <option value="Pendente">Pendente</option>
                                <option value="Confirmada">Confirmada</option>
                                <option value="em_execucao">Em Execução</option>
                                <option value="Concluido">Concluído</option>
                                <option value="Cancelado">Cancelado</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Data Agendada</label>
                            <input
                                type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)}
                                className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 ring-blue-500 text-slate-700"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Descrição</label>
                            <textarea
                                value={description} onChange={(e) => setDescription(e.target.value)}
                                rows={4}
                                className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 ring-blue-500 text-slate-700 resize-none"
                                placeholder="Detalhes do serviço..."
                            />
                        </div>

                        <div className="pt-6 border-t border-slate-100 flex gap-4 mt-2">
                            <button
                                type="button" onClick={() => setEditando(false)} disabled={salvando}
                                className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bold active:scale-95 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit" disabled={salvando}
                                className="flex-1 bg-emerald-500 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-200 active:scale-95 transition-all"
                            >
                                {salvando ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </main>
    );
}
