// src/app/clientes/[id]/page.js
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function DetalhesCliente() {
    const [cliente, setCliente] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editando, setEditando] = useState(false);
    const [nome, setNome] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [email, setEmail] = useState('');
    const [endereco, setEndereco] = useState('');
    const [volume, setVolume] = useState('');
    const [salvando, setSalvando] = useState(false);

    const params = useParams();
    const router = useRouter();
    const { id } = params;

    useEffect(() => {
        async function fetchCliente() {
            if (!id) return;
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .eq('id', id)
                .single();

            if (data) {
                setCliente(data);
                setNome(data.name);
                setWhatsapp(data.whatsapp);
                setEmail(data.email || '');
                setEndereco(data.address || '');
                setVolume(data.pool_volume_m3);
            }
            setLoading(false);
        }
        fetchCliente();
    }, [id]);

    const handleDelete = async () => {
        if (confirm("Tem certeza que deseja excluir esse cliente? (Esta ação não pode ser desfeita)")) {
            setLoading(true);
            const { error } = await supabase.from('customers').delete().eq('id', id);
            if (!error) {
                router.push('/clientes');
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
            .from('customers')
            .update({
                name: nome,
                whatsapp,
                email,
                address: endereco,
                pool_volume_m3: parseFloat(volume)
            })
            .eq('id', id);

        if (!error) {
            setCliente({ ...cliente, name: nome, whatsapp, email, address: endereco, pool_volume_m3: parseFloat(volume) });
            setEditando(false);
        } else {
            alert("Erro ao atualizar: " + error.message);
        }
        setSalvando(false);
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-[#fcfbf8] p-6 flex justify-center items-center">
                <p className="text-slate-400 animate-pulse font-bold text-lg">Carregando detalhes...</p>
            </main>
        );
    }

    if (!cliente) {
        return (
            <main className="min-h-screen bg-[#fcfbf8] p-6 flex flex-col justify-center items-center">
                <p className="text-slate-500 mb-4 text-sm font-medium">Cliente não encontrado.</p>
                <button onClick={() => router.back()} className="text-white font-bold px-4 py-2 bg-[#008080] rounded-xl text-sm">Voltar à lista</button>
            </main>
        );
    }

    return (
        <div className="min-h-screen bg-[#fcfbf8] flex flex-col pb-28">
            {/* Header Fixo igual ao Novo Cliente */}
            <div className="bg-white px-4 py-4 sticky top-0 z-10 border-b border-slate-200 flex items-center gap-3">
                <button
                    onClick={() => router.push('/clientes')}
                    className="text-slate-800 hover:text-slate-600 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>
                </button>
                <h1 className="text-lg font-bold text-slate-800 tracking-wide">
                    {editando ? "Editar Cliente" : "Detalhes do Cliente"}
                </h1>
            </div>

            <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full space-y-5">
                <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-6 shadow-sm">
                    {!editando ? (
                        <>
                            {/* Nome */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block">Nome</label>
                                <p className="text-[15px] font-semibold text-slate-800">
                                    {cliente.name || 'Nome não informado'}
                                </p>
                            </div>

                            {/* WhatsApp */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block">WhatsApp</label>
                                <p className="text-[15px] font-semibold text-slate-800">
                                    {cliente.whatsapp || 'Não informado'}
                                </p>
                            </div>

                            {/* E-mail */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block">E-mail</label>
                                <p className="text-[15px] font-semibold text-slate-800">
                                    {cliente.email || 'Não informado'}
                                </p>
                            </div>

                            {/* Endereço */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block">Endereço</label>
                                <p className="text-[15px] font-semibold text-slate-800">
                                    {cliente.address || 'Não informado'}
                                </p>
                            </div>

                            {/* Volume */}
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block">Volume da Piscina (m³)</label>
                                <div>
                                    <span className={`inline-block text-[10px] font-bold px-3 py-1 rounded-xl uppercase tracking-wider border shadow-sm text-[#008080] border-[#008080]/30 bg-[#008080]/10`}>
                                        {cliente.pool_volume_m3} m³
                                    </span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <form id="edit-form" onSubmit={handleUpdate} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block">Nome *</label>
                                <input
                                    required
                                    type="text"
                                    value={nome}
                                    onChange={(e) => setNome(e.target.value)}
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-[#10b673] focus:border-[#10b673] focus:ring-1 shadow-sm"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block">WhatsApp *</label>
                                <input
                                    required
                                    type="tel"
                                    value={whatsapp}
                                    onChange={(e) => setWhatsapp(e.target.value)}
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-[#10b673] focus:border-[#10b673] focus:ring-1 shadow-sm"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block">E-mail *</label>
                                <input
                                    required
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-[#10b673] focus:border-[#10b673] focus:ring-1 shadow-sm"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block">Endereço</label>
                                <input
                                    type="text"
                                    value={endereco}
                                    onChange={(e) => setEndereco(e.target.value)}
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-[#10b673] focus:border-[#10b673] focus:ring-1 shadow-sm"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block">Volume (m³) *</label>
                                <input
                                    required
                                    type="number"
                                    step="0.1"
                                    value={volume}
                                    onChange={(e) => setVolume(e.target.value)}
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-[#10b673] focus:border-[#10b673] focus:ring-1 shadow-sm"
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
                                Editar Cliente
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
