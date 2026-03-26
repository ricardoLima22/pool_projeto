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
    const [userRole, setUserRole] = useState('');

    const params = useParams();
    const router = useRouter();
    const { id } = params;

    useEffect(() => {
        const role = localStorage.getItem('user_role');
        if (role) setUserRole(role.toLowerCase());

        async function fetchChamado() {
            if (!id) return;
            const { data, error } = await supabase
                .from('service_requests')
                .select('*, customers(name, address), profiles!piscineiro_id(full_name), service_types(name)')
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
        <main className="min-h-screen bg-[#fcfbf8] pb-24">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-4 bg-white border-b border-slate-200 sticky top-0 z-10">
                <button onClick={() => router.push('/chamados')} className="text-slate-800 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
                </button>
                <h1 className="text-lg font-bold text-slate-800">
                    {editando ? "Editar Chamado" : "Detalhes do Chamado"}
                </h1>
            </div>

            <form id="edit-form" onSubmit={handleUpdate} className="px-4 pt-2 pb-6 space-y-1">
                {/* Cliente */}
                <div className="pt-4">
                    <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">
                        CLIENTE
                    </label>
                    <div className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 text-sm">
                        {chamado.customers?.name || 'Cliente Removido'}
                    </div>
                </div>

                {/* Endereço */}
                <div className="pt-4">
                    <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">
                        ENDEREÇO
                    </label>
                    <div className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 text-sm">
                        {chamado.customers?.address || 'Endereço não cadastrado'}
                    </div>
                </div>

                {/* Tipo de Serviço */}
                <div className="pt-4">
                    <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">
                        TIPO DE SERVIÇO
                    </label>
                    <div className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 text-sm">
                        {chamado.service_types?.name || 'Serviço Padrão'}
                    </div>
                </div>

                {/* Atribuído a */}
                <div className="pt-4">
                    <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">
                        ATRIBUÍDO AO FUNCIONÁRIO
                    </label>
                    <div className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 text-sm">
                        {chamado.profiles?.full_name || 'Não atribuído'}
                    </div>
                </div>

                {/* Data e Hora Agendada */}
                <div className="pt-4">
                    <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">
                        DATA E HORA AGENDADA <span className="text-red-500 ml-0.5">*</span>
                    </label>
                    {editando ? (
                        <input
                            type="date"
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                            className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#008080] focus:outline-none transition-colors text-sm rounded-none appearance-none"
                            required
                        />
                    ) : (
                        <div className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 text-sm">
                            {chamado.scheduled_date ? new Date(chamado.scheduled_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Não agendado'}
                        </div>
                    )}
                </div>

                {/* Status */}
                <div className="pt-4">
                    <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">
                        STATUS <span className="text-red-500 ml-0.5">*</span>
                    </label>
                    {editando ? (
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 focus:border-[#008080] focus:outline-none transition-colors text-sm rounded-none appearance-none"
                            style={{ backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '0.65em auto' }}
                        >
                            <option value="Pendente">Pendente</option>
                            <option value="Confirmada">Confirmada</option>
                            <option value="em_execucao">Em Execução</option>
                            <option value="Concluido">Concluído</option>
                            <option value="Cancelado">Cancelado</option>
                        </select>
                    ) : (
                        <div className="py-2.5">
                            <span className={`inline-block text-[10px] font-bold px-3 py-1.5 rounded-xl uppercase tracking-wider border shadow-sm ${getStatusColor(chamado.status)}`}>
                                {formatStatusName(chamado.status)}
                            </span>
                        </div>
                    )}
                </div>

                {/* Descrição / Observações */}
                <div className="pt-4">
                    <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">
                        DESCRIÇÃO / OBSERVAÇÕES
                    </label>
                    {editando ? (
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Detalhes adicionais sobre o serviço..."
                            rows={4}
                            className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#008080] focus:outline-none transition-colors text-sm resize-none rounded-none appearance-none"
                        />
                    ) : (
                        <div className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 text-sm whitespace-pre-wrap">
                            {chamado.description || 'Sem descrição cadastrada.'}
                        </div>
                    )}
                </div>

                {/* Botões */}
                {userRole !== 'funcionario' ? (
                    <div className="pt-8 flex gap-3">
                        {!editando ? (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setEditando(true)}
                                    className="flex-1 bg-[#2ECC71] hover:bg-[#27ae60] text-white py-3.5 rounded-xl font-bold text-sm tracking-wide shadow-sm active:scale-95 transition-all text-center uppercase"
                                >
                                    EDITAR CHAMADO
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    className="flex-1 bg-white hover:bg-slate-50 text-red-500 py-3.5 rounded-xl border border-red-200 font-bold text-sm tracking-wide shadow-sm active:scale-95 transition-all text-center uppercase"
                                >
                                    EXCLUIR
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setEditando(false)}
                                    disabled={salvando}
                                    className="flex-1 bg-white hover:bg-slate-50 text-slate-500 border border-slate-200 py-3.5 rounded-xl font-bold text-sm tracking-wide shadow-sm active:scale-95 transition-all text-center uppercase"
                                >
                                    CANCELAR
                                </button>
                                <button
                                    type="submit"
                                    disabled={salvando}
                                    className="flex-1 bg-[#2ECC71] hover:bg-[#27ae60] text-white py-3.5 rounded-xl font-bold text-sm tracking-wide shadow-sm active:scale-95 transition-all text-center uppercase disabled:opacity-50"
                                >
                                    {salvando ? 'SALVANDO...' : 'SALVAR'}
                                </button>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="pt-8 flex gap-3 pb-4">
                        <button
                            type="button"
                            onClick={() => router.push(`/visita/nova?clienteId=${chamado.customer_id}`)}
                            className="w-full bg-[#2ECC71] hover:bg-[#27ae60] text-white py-3.5 rounded-xl font-bold text-sm tracking-wide shadow-sm active:scale-95 transition-all text-center uppercase"
                        >
                            REGISTRAR VISITA
                        </button>
                    </div>
                )}
            </form>
        </main>
    );
}
