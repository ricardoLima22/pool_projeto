// src/app/clientes/[id]/page.js
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useParams, useRouter } from 'next/navigation';

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
            <main className="min-h-screen bg-slate-50 p-6 flex justify-center items-center">
                <p className="text-slate-400 animate-pulse font-bold text-lg">Carregando detalhes...</p>
            </main>
        );
    }

    if (!cliente) {
        return (
            <main className="min-h-screen bg-slate-50 p-6 flex flex-col justify-center items-center">
                <p className="text-slate-500 mb-4 text-lg">Cliente não encontrado.</p>
                <button onClick={() => router.back()} className="text-blue-500 font-bold px-4 py-2 bg-blue-50 rounded-lg">Voltar à lista</button>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 p-4 pb-24">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => router.push('/clientes')} className="text-slate-500 text-2xl">←</button>
                <h1 className="text-xl font-black text-slate-800">
                    {editando ? "Editar Cliente" : "Detalhes do Cliente"}
                </h1>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-6">
                {!editando ? (
                    <div className="space-y-6">
                        <div>
                            <h2 className="text-xs font-bold text-slate-400 uppercase mb-1">Nome</h2>
                            <p className="text-lg font-bold text-slate-800">{cliente.name}</p>
                        </div>
                        <div>
                            <h2 className="text-xs font-bold text-slate-400 uppercase mb-1">WhatsApp</h2>
                            <p className="text-lg font-bold text-slate-800">{cliente.whatsapp || 'Não informado'}</p>
                        </div>
                        <div>
                            <h2 className="text-xs font-bold text-slate-400 uppercase mb-1">E-mail</h2>
                            <p className="text-lg font-bold text-slate-800">{cliente.email || 'Não informado'}</p>
                        </div>
                        <div>
                            <h2 className="text-xs font-bold text-slate-400 uppercase mb-1">Endereço</h2>
                            <p className="text-lg font-bold text-slate-800">{cliente.address || 'Não informado'}</p>
                        </div>
                        <div>
                            <h2 className="text-xs font-bold text-slate-400 uppercase mb-1">Volume da Piscina (m³)</h2>
                            <p className="text-lg font-bold text-blue-600 bg-blue-50 inline-block px-3 py-1 rounded-xl">{cliente.pool_volume_m3} m³</p>
                        </div>

                        <div className="pt-6 mt-4 border-t border-slate-100 flex gap-4">
                            <button
                                onClick={() => setEditando(true)}
                                className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-all text-sm uppercase"
                            >
                                Editar Cliente
                            </button>
                            <button
                                onClick={handleDelete}
                                className="flex-1 bg-red-100 text-red-600 py-4 rounded-2xl font-bold active:scale-95 transition-all text-sm uppercase hover:bg-red-200"
                            >
                                Excluir Cliente
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleUpdate} className="space-y-5 flex flex-col">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Nome</label>
                            <input
                                required type="text" value={nome} onChange={(e) => setNome(e.target.value)}
                                className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 ring-blue-500 text-slate-700"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">WhatsApp</label>
                            <input
                                required type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)}
                                className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 ring-blue-500 text-slate-700"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">E-mail</label>
                            <input
                                required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 ring-blue-500 text-slate-700"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Endereço</label>
                            <input
                                type="text" value={endereco} onChange={(e) => setEndereco(e.target.value)}
                                className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 ring-blue-500 text-slate-700"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Volume (m³)</label>
                            <input
                                required type="number" step="0.1" value={volume} onChange={(e) => setVolume(e.target.value)}
                                className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 ring-blue-500 text-slate-700"
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
