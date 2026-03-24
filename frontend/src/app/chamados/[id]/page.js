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
        <main className="min-h-screen bg-[#fcfbf8] md:p-6 lg:p-8">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-6 md:px-0">
                <button onClick={() => router.back()} className="text-slate-800 hover:text-slate-500 transition-colors">
                    <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
                </button>
                <h1 className="text-[15px] font-bold text-slate-800">
                    {editando ? "Editar Chamado" : "Detalhes do Chamado"}
                </h1>
            </div>

            <div className="px-5 md:px-0 max-w-4xl">
                <div className="bg-white p-6 rounded-[24px] border border-slate-200/80 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] mb-10">
                    {!editando ? (
                        <div className="flex flex-col h-full">
                            <div className="space-y-5 flex-grow">
                                {/* Cliente */}
                                <div>
                                    <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Cliente</h2>
                                    <p className="text-[15px] font-semibold text-slate-800">
                                        {chamado.customers?.name || 'Cliente Removido'}
                                    </p>
                                </div>

                                {/* Status */}
                                <div>
                                    <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Status</h2>
                                    <span className={`inline-block text-[10px] font-bold px-3 py-1 rounded-xl uppercase tracking-wider border shadow-sm ${getStatusColor(chamado.status)}`}>
                                        {formatStatusName(chamado.status)}
                                    </span>
                                </div>

                                {/* Data Agendada */}
                                <div>
                                    <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Data Agendada</h2>
                                    <p className="text-[15px] font-semibold text-slate-800">
                                        {chamado.scheduled_date ? new Date(chamado.scheduled_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Não agendado'}
                                    </p>
                                </div>

                                {/* Tipo de Serviço */}
                                <div>
                                    <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tipo de Serviço</h2>
                                    <p className="text-[15px] font-semibold text-slate-800">
                                        {chamado.service_types?.name || 'Serviço Padrão'}
                                    </p>
                                </div>

                                {/* Responsável */}
                                <div>
                                    <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Responsável (Piscineiro)</h2>
                                    <p className="text-[15px] font-semibold text-slate-800">
                                        {chamado.profiles?.full_name || 'Não atribuído'}
                                    </p>
                                </div>

                                {/* Descrição */}
                                <div>
                                    <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Descrição</h2>
                                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 min-h-[80px]">
                                        <p className="text-[14px] text-slate-600 whitespace-pre-wrap leading-relaxed">
                                            {chamado.description || 'Sem descrição cadastrada.'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Botões de Ação */}
                            <div className="pt-8 flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => setEditando(true)}
                                    className="flex-1 bg-[#2ECC71] hover:bg-[#27ae60] text-white py-3.5 rounded-xl font-bold uppercase text-[12px] tracking-wide active:scale-[0.98] transition-all"
                                >
                                    Editar Chamado
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="flex-1 bg-white hover:bg-slate-50 text-red-500 py-3.5 rounded-xl font-bold uppercase text-[12px] tracking-wide border border-slate-200 active:scale-[0.98] transition-all"
                                >
                                    Excluir
                                </button>
                            </div>
                        </div>

                    ) : (
                        <form onSubmit={handleUpdate} className="flex flex-col h-full space-y-5">
                            <div>
                                <label className="text-[10px] font-bold text-[#008080] uppercase tracking-widest block mb-1">Status *</label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className="w-full p-3 bg-white rounded-xl border border-slate-200 focus:border-[#008080] focus:ring-1 focus:ring-[#008080] text-slate-700 font-medium transition-all outline-none text-[14px]"
                                >
                                    <option value="Pendente">Pendente</option>
                                    <option value="Confirmada">Confirmada</option>
                                    <option value="em_execucao">Em Execução</option>
                                    <option value="Concluido">Concluído</option>
                                    <option value="Cancelado">Cancelado</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-[#008080] uppercase tracking-widest block mb-1">Data Agendada *</label>
                                <input
                                    type="date"
                                    value={scheduledDate}
                                    onChange={(e) => setScheduledDate(e.target.value)}
                                    className="w-full p-3 bg-white rounded-xl border border-slate-200 focus:border-[#008080] focus:ring-1 focus:ring-[#008080] text-slate-700 font-medium transition-all outline-none text-[14px]"
                                />
                            </div>

                            <div className="flex-grow">
                                <label className="text-[10px] font-bold text-[#008080] uppercase tracking-widest block mb-1">Descrição / Observações</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={5}
                                    className="w-full p-3 bg-white rounded-xl border border-slate-200 focus:border-[#008080] focus:ring-1 focus:ring-[#008080] text-[14px] text-slate-700 transition-all outline-none resize-none"
                                    placeholder="Detalhes adicionais sobre o serviço..."
                                />
                            </div>

                            <div className="pt-6 flex flex-col sm:flex-row gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditando(false)}
                                    disabled={salvando}
                                    className="flex-1 bg-white hover:bg-slate-50 text-slate-500 py-3.5 rounded-xl font-bold uppercase text-[12px] tracking-wide border border-slate-200 active:scale-[0.98] transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={salvando}
                                    className="flex-1 bg-[#2ECC71] hover:bg-[#27ae60] text-white py-3.5 rounded-xl font-bold uppercase text-[12px] tracking-wide shadow-sm hover:shadow-md active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                    {salvando ? 'Salvando...' : 'Salvar Alterações'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </main>
    );
}
