// src/app/clientes/[id]/page.js
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import SplashScreen from '../../../components/SplashScreen';

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
    const [userRole, setUserRole] = useState('');

    const params = useParams();
    const router = useRouter();
    const { id } = params;

    useEffect(() => {
        const role = localStorage.getItem('user_role');
        if (role) setUserRole(role.toLowerCase());

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
        return <SplashScreen message="Carregando detalhes..." />;
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
        <main className="min-h-screen bg-[#fcfbf8] pb-24">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-4 pt-6 bg-white border-b border-slate-200 sticky top-0 z-10">
                <button onClick={() => router.push('/clientes')} className="text-slate-800 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                </button>
                <h1 className="text-lg font-bold text-slate-800">
                    {editando ? "Editar Cliente" : "Detalhes do Cliente"}
                </h1>
            </div>

            <div className="px-4 pt-2 pb-6 space-y-1">
                {!editando ? (
                    <div className="space-y-1">
                        <div className="pt-4">
                            <h2 className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Nome</h2>
                            <p className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 text-sm font-medium">{cliente.name}</p>
                        </div>
                        <div className="pt-4">
                            <h2 className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">WhatsApp</h2>
                            <p className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 text-sm font-medium">{cliente.whatsapp || 'Não informado'}</p>
                        </div>
                        <div className="pt-4">
                            <h2 className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">E-mail</h2>
                            <p className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 text-sm font-medium">{cliente.email || 'Não informado'}</p>
                        </div>
                        <div className="pt-4">
                            <h2 className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Endereço</h2>
                            <p className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 text-sm font-medium">{cliente.address || 'Não informado'}</p>
                        </div>
                        <div className="pt-4">
                            <h2 className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Volume da Piscina (m³)</h2>
                            <div className="w-full border-b-2 border-slate-200 bg-transparent py-3">
                                <p className="text-sm font-bold text-[#3b82f6] bg-blue-50 inline-block px-3 py-1 rounded-md">{cliente.pool_volume_m3} m³</p>
                            </div>
                        </div>

                        {userRole !== 'funcionario' && (
                            <div className="pt-8 flex gap-4">
                                <button
                                    onClick={() => setEditando(true)}
                                    className="flex-1 bg-[#2ECC71] hover:bg-[#27ae60] text-white py-3.5 rounded-xl font-bold text-sm tracking-wide shadow-sm active:scale-95 transition-all text-center uppercase"
                                >
                                    Editar Cliente
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="flex-1 bg-white border border-red-500 text-red-500 hover:bg-red-50 py-3.5 rounded-xl font-bold active:scale-95 transition-all text-sm uppercase text-center"
                                >
                                    Excluir Cliente
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <form onSubmit={handleUpdate} className="space-y-1 flex flex-col">
                        <div className="pt-4">
                            <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Nome</label>
                            <input
                                required type="text" value={nome} onChange={(e) => setNome(e.target.value)}
                                className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#008080] focus:outline-none transition-colors text-sm"
                            />
                        </div>
                        <div className="pt-4">
                            <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">WhatsApp</label>
                            <input
                                required type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)}
                                className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#008080] focus:outline-none transition-colors text-sm"
                            />
                        </div>
                        <div className="pt-4">
                            <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">E-mail</label>
                            <input
                                required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#008080] focus:outline-none transition-colors text-sm"
                            />
                        </div>
                        <div className="pt-4">
                            <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Endereço</label>
                            <input
                                type="text" value={endereco} onChange={(e) => setEndereco(e.target.value)}
                                className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#008080] focus:outline-none transition-colors text-sm"
                            />
                        </div>
                        <div className="pt-4">
                            <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Volume (m³)</label>
                            <input
                                required type="number" step="0.1" value={volume} onChange={(e) => setVolume(e.target.value)}
                                className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#008080] focus:outline-none transition-colors text-sm"
                            />
                        </div>

                        <div className="pt-8 flex gap-4">
                            <button
                                type="button" onClick={() => setEditando(false)} disabled={salvando}
                                className="flex-1 bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 py-3.5 rounded-xl font-bold active:scale-95 transition-all text-sm uppercase text-center"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit" disabled={salvando}
                                className="flex-1 bg-[#2ECC71] hover:bg-[#27ae60] text-white py-3.5 rounded-xl font-bold tracking-wide shadow-sm active:scale-95 transition-all text-sm uppercase text-center"
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
