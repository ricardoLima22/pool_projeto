// src/app/chamados/[id]/page.js
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import SplashScreen from '../../../components/SplashScreen';

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
            case 'pendente': return 'text-orange-500 border-orange-200 bg-orange-50/50';
            case 'concluido': 
            case 'concluído': 
            case 'confirmada': return 'text-emerald-500 border-emerald-200 bg-emerald-50/50';
            case 'em_execucao': return 'text-blue-500 border-blue-200 bg-blue-50/50';
            case 'cancelado': return 'text-red-500 border-red-200 bg-red-50/50';
            default: return 'text-slate-500 border-slate-200 bg-slate-50/50';
        }
    };

    if (loading) {
        return <SplashScreen message="Carregando detalhes..." />;
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
        <div className="min-h-screen bg-[#fcfbf8] flex flex-col pb-28">
            {/* Header Fixo igual ao Novo Chamado */}
            <div className="bg-white px-4 py-4 sticky top-0 z-10 border-b border-slate-200 flex items-center gap-3">
                <button
                    onClick={() => router.push('/chamados')}
                    className="text-slate-800 hover:text-slate-600 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
                </button>
                <h1 className="text-lg font-bold text-slate-800 tracking-wide">
                    {editando ? "Editar Chamado" : "Detalhes do Chamado"}
                </h1>
            </div>

            <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full space-y-5">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-6 shadow-sm">
                    {!editando ? (
                        <>
                            {/* Cliente */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block">
                                    Cliente
                                </label>
                                <p className="text-[15px] font-semibold text-slate-800">
                                    {chamado.customers?.name || 'Cliente Removido'}
                                </p>
                            </div>

                            {/* Status */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block">
                                    Status
                                </label>
                                <span className={`inline-block text-[10px] font-bold px-3 py-1 rounded-xl uppercase tracking-wider border shadow-sm ${getStatusColor(chamado.status)}`}>
                                    {formatStatusName(chamado.status)}
                                </span>
                            </div>

                            {/* Data Agendada */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block">
                                    Data Agendada
                                </label>
                                <p className="text-[15px] font-semibold text-slate-800">
                                    {chamado.scheduled_date ? new Date(chamado.scheduled_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Não agendado'}
                                </p>
                            </div>

                            {/* Tipo de Serviço */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block">
                                    Tipo de Serviço
                                </label>
                                <p className="text-[15px] font-semibold text-slate-800">
                                    {chamado.service_types?.name || 'Serviço Padrão'}
                                </p>
                            </div>

                            {/* Responsável */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block">
                                    Atribuído ao Funcionário
                                </label>
                                <p className="text-[15px] font-semibold text-slate-800">
                                    {chamado.profiles?.full_name || 'Não atribuído'}
                                </p>
                            </div>

                            {/* Descrição */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block">
                                    Descrição / Observações
                                </label>
                                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 min-h-[80px]">
                                    <p className="text-[14px] text-slate-600 whitespace-pre-wrap leading-relaxed">
                                        {chamado.description || 'Sem descrição cadastrada.'}
                                    </p>
                                </div>
                            </div>
                        </>
                    ) : (
                        <form id="edit-form" onSubmit={handleUpdate} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block">Status *</label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-[#10b673] focus:border-[#10b673] focus:ring-1 shadow-sm"
                                >
                                    <option value="Pendente">Pendente</option>
                                    <option value="Confirmada">Confirmada</option>
                                    <option value="em_execucao">Em Execução</option>
                                    <option value="Concluido">Concluído</option>
                                    <option value="Cancelado">Cancelado</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block">Data Agendada *</label>
                                <input
                                    type="date"
                                    value={scheduledDate}
                                    onChange={(e) => setScheduledDate(e.target.value)}
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-[#10b673] focus:border-[#10b673] focus:ring-1 shadow-sm"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block">Descrição / Observações</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Detalhes adicionais sobre o serviço..."
                                    className="flex min-h-[120px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-[#10b673] focus:border-[#10b673] focus:ring-1 shadow-sm resize-none"
                                />
                            </div>
                        </form>
                    )}
                </div>
            </main>

            {/* Footer com Botões */}
            <div className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-[#fcfbf8] border-t border-slate-200 z-10 shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.05)]">
                <div className="max-w-2xl mx-auto flex gap-3">
                    {!editando ? (
                        <>
                            <button
                                onClick={() => setEditando(true)}
                                className="flex-1 bg-[#2ECC71] hover:bg-[#27ae60] text-white py-3.5 rounded-xl font-bold uppercase text-[12px] tracking-wide active:scale-[0.98] transition-all shadow-sm"
                            >
                                Editar Chamado
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 bg-white hover:bg-slate-50 text-red-500 py-3.5 rounded-xl font-bold uppercase text-[12px] tracking-wide border border-slate-200 active:scale-[0.98] transition-all"
                            >
                                Excluir
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                type="button"
                                onClick={() => setEditando(false)}
                                disabled={salvando}
                                className="flex-1 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 py-3.5 rounded-xl font-bold uppercase text-[12px] tracking-wide active:scale-[0.98] transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                form="edit-form"
                                disabled={salvando}
                                className="flex-1 bg-[#2ECC71] hover:bg-[#27ae60] text-white py-3.5 rounded-xl font-bold uppercase text-[12px] tracking-wide active:scale-[0.98] transition-all shadow-sm disabled:opacity-50"
                            >
                                {salvando ? 'Salvando...' : 'Salvar'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
