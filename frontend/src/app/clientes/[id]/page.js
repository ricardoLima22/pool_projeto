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
        <main className="min-h-screen bg-[#fcfbf8] md:p-6 lg:p-8">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-6 md:px-0">
                <button onClick={() => router.push('/clientes')} className="text-slate-800 hover:text-slate-500 transition-colors">
                    <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
                </button>
                <h1 className="text-[15px] font-bold text-slate-800">
                    {editando ? "Editar Cliente" : "Detalhes do Cliente"}
                </h1>
            </div>

            <div className="px-5 md:px-0 max-w-4xl">
                <div className="bg-white p-6 rounded-[24px] border border-slate-200/80 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] mb-10">
                    {!editando ? (
                        <div className="flex flex-col h-full">
                            <div className="space-y-5 flex-grow">
                                {/* Nome */}
                                <div>
                                    <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Nome</h2>
                                    <p className="text-[15px] font-semibold text-slate-800">
                                        {cliente.name || 'Nome não informado'}
                                    </p>
                                </div>

                                {/* WhatsApp */}
                                <div>
                                    <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">WhatsApp</h2>
                                    <p className="text-[15px] font-semibold text-slate-800">
                                        {cliente.whatsapp || 'Não informado'}
                                    </p>
                                </div>

                                {/* E-mail */}
                                <div>
                                    <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">E-mail</h2>
                                    <p className="text-[15px] font-semibold text-slate-800">
                                        {cliente.email || 'Não informado'}
                                    </p>
                                </div>

                                {/* Endereço */}
                                <div>
                                    <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Endereço</h2>
                                    <p className="text-[15px] font-semibold text-slate-800">
                                        {cliente.address || 'Não informado'}
                                    </p>
                                </div>

                                {/* Volume */}
                                <div>
                                    <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Volume da Piscina (m³)</h2>
                                    <span className={`inline-block text-[10px] font-bold px-3 py-1 rounded-xl uppercase tracking-wider border shadow-sm text-[#008080] border-[#008080]/30 bg-[#008080]/10`}>
                                        {cliente.pool_volume_m3} m³
                                    </span>
                                </div>
                            </div>

                            {/* Botões de Ação */}
                            <div className="pt-8 flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => setEditando(true)}
                                    className="flex-1 bg-[#2ECC71] hover:bg-[#27ae60] text-white py-3.5 rounded-xl font-bold uppercase text-[12px] tracking-wide active:scale-[0.98] transition-all"
                                >
                                    Editar Cliente
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="flex-1 bg-white hover:bg-slate-50 text-red-500 py-3.5 rounded-xl font-bold uppercase text-[12px] tracking-wide border border-slate-200 active:scale-[0.98] transition-all"
                                >
                                    Excluir Cliente
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleUpdate} className="flex flex-col h-full space-y-5">
                            <div>
                                <label className="text-[10px] font-bold text-[#008080] uppercase tracking-widest block mb-1">Nome *</label>
                                <input
                                    required
                                    type="text"
                                    value={nome}
                                    onChange={(e) => setNome(e.target.value)}
                                    className="w-full p-3 bg-white rounded-xl border border-slate-200 focus:border-[#008080] focus:ring-1 focus:ring-[#008080] text-slate-700 font-medium transition-all outline-none text-[14px]"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-[#008080] uppercase tracking-widest block mb-1">WhatsApp *</label>
                                <input
                                    required
                                    type="tel"
                                    value={whatsapp}
                                    onChange={(e) => setWhatsapp(e.target.value)}
                                    className="w-full p-3 bg-white rounded-xl border border-slate-200 focus:border-[#008080] focus:ring-1 focus:ring-[#008080] text-slate-700 font-medium transition-all outline-none text-[14px]"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-[#008080] uppercase tracking-widest block mb-1">E-mail *</label>
                                <input
                                    required
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full p-3 bg-white rounded-xl border border-slate-200 focus:border-[#008080] focus:ring-1 focus:ring-[#008080] text-slate-700 font-medium transition-all outline-none text-[14px]"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-[#008080] uppercase tracking-widest block mb-1">Endereço</label>
                                <input
                                    type="text"
                                    value={endereco}
                                    onChange={(e) => setEndereco(e.target.value)}
                                    className="w-full p-3 bg-white rounded-xl border border-slate-200 focus:border-[#008080] focus:ring-1 focus:ring-[#008080] text-slate-700 font-medium transition-all outline-none text-[14px]"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-[#008080] uppercase tracking-widest block mb-1">Volume (m³) *</label>
                                <input
                                    required
                                    type="number"
                                    step="0.1"
                                    value={volume}
                                    onChange={(e) => setVolume(e.target.value)}
                                    className="w-full p-3 bg-white rounded-xl border border-slate-200 focus:border-[#008080] focus:ring-1 focus:ring-[#008080] text-slate-700 font-medium transition-all outline-none text-[14px]"
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
