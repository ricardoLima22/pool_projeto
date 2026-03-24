// src/app/chamados/[id]/page.js
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

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
        <main className="min-h-screen bg-[#fcfbf8] md:p-8">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-6">
                <button onClick={() => router.back()} className="text-slate-800 hover:text-slate-500 transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="text-xl font-black text-slate-800 tracking-tight">
                    {editando ? "Editar Chamado" : "Detalhes do Chamado"}
                </h1>
            </div>

            <div className="px-5">
                <div className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-sm mb-10">
                    {!editando ? (
                        <div className="space-y-7">
                            {/* Cliente */}
                            <div>
                                <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Cliente</h2>
                                <p className="text-lg font-bold text-slate-800 leading-tight">
                                    {chamado.customers?.name || 'Cliente Removido'}
                                </p>
                            </div>

                            {/* Status */}
                            <div>
                                <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Status</h2>
                                <span className={`text-[11px] font-black px-3.5 py-1.5 rounded-lg uppercase tracking-wider ${getStatusColor(chamado.status)} shadow-sm border border-current opacity-80`}>
                                    {formatStatusName(chamado.status)}
                                </span>
                            </div>

                            {/* Data Agendada */}
                            <div>
                                <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Data Agendada</h2>
                                <p className="text-lg font-bold text-slate-800 leading-tight">
                                    {chamado.scheduled_date ? new Date(chamado.scheduled_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Não agendado'}
                                </p>
                            </div>

                            {/* Tipo de Serviço */}
                            <div>
                                <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Tipo de Serviço</h2>
                                <p className="text-lg font-bold text-slate-800 leading-tight">
                                    {chamado.service_types?.name || 'Serviço Padrão'}
                                </p>
                            </div>

                            {/* Responsável */}
                            <div>
                                <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Responsável (Piscineiro)</h2>
                                <p className="text-lg font-bold text-slate-800 leading-tight">
                                    {chamado.profiles?.full_name || 'Não atribuído'}
                                </p>
                            </div>

                            {/* Descrição */}
                            <div>
                                <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Descrição</h2>
                                <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-100 min-h-[100px]">
                                    <p className="text-[15px] text-slate-600 leading-relaxed whitespace-pre-wrap">
                                        {chamado.description || 'Nenhuma observação fornecida.'}
                                    </p>
                                </div>
                            </div>

                            {/* Botões de Ação */}
                            <div className="pt-4 flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => setEditando(true)}
                                    className="flex-1 bg-[#22c55e] hover:bg-[#16a34a] text-white py-4.5 rounded-2xl font-black shadow-md hover:shadow-lg transition-all text-sm uppercase tracking-widest active:scale-[0.98]"
                                >
                                    Editar Chamado
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="flex-1 bg-white hover:bg-red-50 text-red-500 py-4.5 rounded-2xl font-black border-2 border-red-500 transition-all text-sm uppercase tracking-widest active:scale-[0.98]"
                                >
                                    Excluir
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleUpdate} className="space-y-6">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Status</label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="w-full p-4 bg-slate-50 rounded-2xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#22c55e] text-slate-700 font-bold transition-all outline-none"
                                >
                                    <option value="Pendente">Pendente</option>
                                    <option value="Confirmada">Confirmada</option>
                                    <option value="em_execucao">Em Execução</option>
                                    <option value="Concluido">Concluído</option>
                                    <option value="Cancelado">Cancelado</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Data Agendada</label>
                                <input
                                    type="date"
                                    value={scheduledDate}
                                    onChange={(e) => setScheduledDate(e.target.value)}
                                    className="w-full p-4 bg-slate-50 rounded-2xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#22c55e] text-slate-700 font-bold transition-all outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Descrição / Observações</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={5}
                                    className="w-full p-4 bg-slate-50 rounded-2xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#22c55e] text-slate-700 font-medium transition-all outline-none resize-none"
                                    placeholder="Detalhes adicionais sobre o serviço..."
                                />
                            </div>

                            <div className="pt-4 flex flex-col sm:flex-row gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditando(false)}
                                    disabled={salvando}
                                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-4.5 rounded-2xl font-black transition-all text-sm uppercase tracking-widest"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={salvando}
                                    className="flex-1 bg-[#22c55e] hover:bg-[#16a34a] text-white py-4.5 rounded-2xl font-black shadow-md hover:shadow-lg transition-all text-sm uppercase tracking-widest disabled:opacity-50"
                                >
                                    {salvando ? 'Salvando...' : 'Salvar Detalhes'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </main>
    );
}
