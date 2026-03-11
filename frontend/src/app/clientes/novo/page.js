// src/app/clientes/novo/page.js
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase'; // Caminho relativo corrigido
import { useRouter } from 'next/navigation';

export default function NovoCliente() {
    const [nome, setNome] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [email, setEmail] = useState('');
    const [endereco, setEndereco] = useState('');
    const [volume, setVolume] = useState('');
    const [companyId, setCompanyId] = useState(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // 1. Ao carregar a tela, pegamos o ID da empresa do usuário logado
    useEffect(() => {
        async function getCompany() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('company_id')
                    .eq('id', user.id)
                    .single();

                if (profile) setCompanyId(profile.company_id);
            }
        }
        getCompany();
    }, []);

    const handleSalvar = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Pega o ID do usuário logado
        const { data: { user } } = await supabase.auth.getUser();

        // 2. Inserimos o cliente amarrado à empresa (Multi-tenancy) e ao usuário
        const { error } = await supabase
            .from('customers')
            .insert([
                {
                    name: nome,
                    whatsapp: whatsapp,
                    email: email,
                    address: endereco,
                    pool_volume_m3: parseFloat(volume),
                    company_id: companyId,
                    piscineiro_id: user?.id
                }
            ]);

        if (error) {
            alert("Erro ao salvar cliente: " + error.message);
        } else {
            router.push('/clientes'); // Volta para a listagem
        }
        setLoading(false);
    };

    return (
        <main className="min-h-screen bg-white p-6 pb-24">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => router.back()} className="text-slate-400">←</button>
                <h1 className="text-xl font-black text-slate-800">Novo Cliente</h1>
            </div>

            <form onSubmit={handleSalvar} className="space-y-5">
                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Nome do Cliente</label>
                    <input
                        required
                        type="text"
                        placeholder="Ex: Casa do João"
                        className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 ring-blue-500 text-slate-950 placeholder:text-slate-400"
                        onChange={(e) => setNome(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">WhatsApp (DDD + Número)</label>
                    <input
                        required
                        type="tel"
                        placeholder="Ex: 27999887766"
                        className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 ring-blue-500 text-slate-950 placeholder:text-slate-400"
                        onChange={(e) => setWhatsapp(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">E-mail</label>
                    <input
                        required
                        type="email"
                        placeholder="Ex: cliente@email.com"
                        className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 ring-blue-500 text-slate-950 placeholder:text-slate-400"
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Endereço</label>
                    <input
                        type="text"
                        placeholder="Rua, Número, Bairro"
                        className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 ring-blue-500 text-slate-950 placeholder:text-slate-400"
                        onChange={(e) => setEndereco(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Volume da Piscina (m³)</label>
                    <input
                        required
                        type="number"
                        step="0.1"
                        placeholder="Ex: 45.5"
                        className="w-full p-4 bg-slate-50 rounded-2xl border-none focus:ring-2 ring-blue-500 text-slate-950 placeholder:text-slate-400"
                        onChange={(e) => setVolume(e.target.value)}
                    />
                </div>

                <button
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-5 rounded-3xl font-black text-lg shadow-xl shadow-blue-100 active:scale-95 transition-all"
                >
                    {loading ? 'SALVANDO...' : 'CADASTRAR PISCINA'}
                </button>
            </form>
        </main>
    );
}
