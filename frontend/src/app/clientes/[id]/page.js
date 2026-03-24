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
        <main className="min-h-screen bg-[#fcfbf8] md:p-8">
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-6">
                <button onClick={() => router.push('/clientes')} className="text-slate-800 hover:text-slate-500 transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h1 className="text-xl font-black text-slate-800 tracking-tight">
                    {editando ? "Editar Cliente" : "Detalhes do Cliente"}
                </h1>
            </div>

            <div className="px-5">
                <div className="bg-white p-7 rounded-[32px] border border-slate-100 shadow-sm mb-10">
                    {!editando ? (
                        <div className="space-y-7">
                            {/* Nome */}
                            <div>
                                <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Nome</h2>
                                <p className="text-lg font-bold text-slate-800 leading-tight">
                                    {cliente.name || 'Nome não informado'}
                                </p>
                            </div>

                            {/* WhatsApp */}
                            <div>
                                <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">WhatsApp</h2>
                                <p className="text-lg font-bold text-slate-800 leading-tight">
                                    {cliente.whatsapp || 'Não informado'}
                                </p>
                            </div>

                            {/* E-mail */}
                            <div>
                                <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">E-mail</h2>
                                <p className="text-lg font-bold text-slate-800 leading-tight">
                                    {cliente.email || 'Não informado'}
                                </p>
                            </div>

                            {/* Endereço */}
                            <div>
                                <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Endereço</h2>
                                <p className="text-lg font-bold text-slate-800 leading-tight">
                                    {cliente.address || 'Não informado'}
                                </p>
                            </div>

                            {/* Volume */}
                            <div>
                                <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Volume da Piscina (m³)</h2>
                                <span className={`text-[11px] font-black px-3.5 py-1.5 rounded-lg uppercase tracking-wider text-[#008080] bg-[#008080]/10 shadow-sm border border-current opacity-80`}>
                                    {cliente.pool_volume_m3} m³
                                </span>
                            </div>

                            {/* Botões de Ação */}
                            <div className="pt-4 flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => setEditando(true)}
                                    className="flex-1 bg-[#2ECC71] hover:bg-[#27ae60] text-white py-4.5 rounded-2xl font-black shadow-md hover:shadow-lg transition-all text-sm uppercase tracking-widest active:scale-[0.98]"
                                >
                                    Editar Cliente
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="flex-1 bg-white hover:bg-red-50 text-red-500 py-4.5 rounded-2xl font-black border-2 border-red-500 transition-all text-sm uppercase tracking-widest active:scale-[0.98]"
                                >
                                    Excluir Cliente
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleUpdate} className="space-y-6">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Nome</label>
                                <input
                                    required
                                    type="text"
                                    value={nome}
                                    onChange={(e) => setNome(e.target.value)}
                                    className="w-full p-4 bg-slate-50 rounded-2xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#008080] text-slate-700 font-bold transition-all outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">WhatsApp</label>
                                <input
                                    required
                                    type="tel"
                                    value={whatsapp}
                                    onChange={(e) => setWhatsapp(e.target.value)}
                                    className="w-full p-4 bg-slate-50 rounded-2xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#008080] text-slate-700 font-bold transition-all outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">E-mail</label>
                                <input
                                    required
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full p-4 bg-slate-50 rounded-2xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#008080] text-slate-700 font-bold transition-all outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Endereço</label>
                                <input
                                    type="text"
                                    value={endereco}
                                    onChange={(e) => setEndereco(e.target.value)}
                                    className="w-full p-4 bg-slate-50 rounded-2xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#008080] text-slate-700 font-bold transition-all outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Volume (m³)</label>
                                <input
                                    required
                                    type="number"
                                    step="0.1"
                                    value={volume}
                                    onChange={(e) => setVolume(e.target.value)}
                                    className="w-full p-4 bg-slate-50 rounded-2xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-[#008080] text-slate-700 font-bold transition-all outline-none"
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
                                    className="flex-1 bg-[#2ECC71] hover:bg-[#27ae60] text-white py-4.5 rounded-2xl font-black shadow-md hover:shadow-lg transition-all text-sm uppercase tracking-widest disabled:opacity-50"
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
