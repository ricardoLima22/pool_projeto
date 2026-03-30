// src/app/clientes/novo/page.js
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase'; // Caminho relativo corrigido
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

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
        
        // Tira todos os espaços vazios do início e do final
        const nomeLimpo = nome.trim();
        if (nomeLimpo.length < 3) {
            toast.error('Por favor, informe um nome de cliente válido com pelo menos 3 letras.');
            return;
        }

        // Validação Mínima e Máxima do WhatsApp (Permitir BR e Gringo)
        // Remove tudo que não for número
        const somenteNumeros = whatsapp.replace(/\D/g, '');
        
        // ITU-T E.164 (Padrão Internacional) diz que um número tem entre 10 e 15 dígitos.
        if (somenteNumeros.length < 10 || somenteNumeros.length > 15) {
            toast.error('Por favor, informe um número de WhatsApp válido contendo DDD (Mínimo de 10 e Máximo de 15 números).');
            return;
        }

        setLoading(true);

        // Pega o ID do usuário logado
        const { data: { user } } = await supabase.auth.getUser();

        // 2. Inserimos o cliente amarrado à empresa (Multi-tenancy) e ao usuário
        const { error } = await supabase
            .from('customers')
            .insert([
                {
                    name: nomeLimpo,
                    whatsapp: somenteNumeros, // Salva formato limpo no banco
                    email: email || null,
                    address: endereco,
                    pool_volume_m3: parseFloat(volume),
                    company_id: companyId,
                    piscineiro_id: user?.id
                }
            ]);

        if (error) {
            toast.error('Erro ao salvar cliente: ' + error.message);
        } else {
            toast.success('Cliente cadastrado com sucesso!');
            router.push('/clientes');
        }
        setLoading(false);
    };

    return (
        <main className="min-h-screen bg-[#fcfbf8] pb-24">
            <div className="flex items-center gap-3 px-4 py-4 bg-white border-b border-slate-200 sticky top-0 z-10">
                <button onClick={() => router.back()} className="text-slate-800 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                </button>
                <h1 className="text-lg font-bold text-slate-800">Novo Cliente</h1>
            </div>

            <form onSubmit={handleSalvar} className="px-4 pt-2 pb-6 space-y-1">
                <div className="pt-4">
                    <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Nome do Cliente</label>
                    <input
                        required
                        type="text"
                        placeholder="Ex: Casa do João"
                        className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#008080] focus:outline-none transition-colors text-sm rounded-none appearance-none"
                        onChange={(e) => setNome(e.target.value)}
                    />
                </div>

                <div className="pt-4">
                    <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">WhatsApp (DDD + Número)</label>
                    <input
                        required
                        type="tel"
                        placeholder="Ex: 27999887766"
                        className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#008080] focus:outline-none transition-colors text-sm rounded-none appearance-none"
                        onChange={(e) => setWhatsapp(e.target.value)}
                    />
                </div>

                <div className="pt-4">
                    <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">E-mail (Opcional)</label>
                    <input
                        type="email"
                        placeholder="Ex: cliente@email.com"
                        className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#008080] focus:outline-none transition-colors text-sm rounded-none appearance-none"
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>

                <div className="pt-4">
                    <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Endereço</label>
                    <input
                        type="text"
                        placeholder="Rua, Número, Bairro"
                        className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#008080] focus:outline-none transition-colors text-sm rounded-none appearance-none"
                        onChange={(e) => setEndereco(e.target.value)}
                    />
                </div>

                <div className="pt-4">
                    <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Volume da Piscina (m³)</label>
                    <input
                        required
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="Ex: 45.5"
                        className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#008080] focus:outline-none transition-colors text-sm rounded-none appearance-none"
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || Number(val) >= 0) {
                                setVolume(val);
                            }
                        }}
                    />
                </div>

                <div className="pt-8">
                    <button
                        disabled={loading}
                        className="w-full bg-[#2ECC71] hover:bg-[#27ae60] text-white py-3.5 rounded-xl font-bold text-sm tracking-wide shadow-sm active:scale-95 transition-all text-center"
                    >
                        {loading ? 'SALVANDO...' : 'CADASTRAR PISCINA'}
                    </button>
                </div>
            </form>
        </main>
    );
}
