// src/app/servicos/novo/page.js
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function NovoServico() {
    const [nome, setNome] = useState('');
    const [companyId, setCompanyId] = useState(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

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
        if (!companyId) return alert("Empresa não encontrada no seu perfil.");

        setLoading(true);

        const { error } = await supabase
            .from('service_type')
            .insert([
                {
                    name: nome,
                    active: true,
                    company_id: companyId
                }
            ]);

        setLoading(false);

        if (error) {
            alert("Erro ao salvar serviço: " + error.message);
        } else {
            router.back(); 
        }
    };

    return (
        <main className="min-h-screen bg-[#fcfbf8] pb-24">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-4 bg-white border-b border-slate-200 sticky top-0 z-10">
                <button onClick={() => router.back()} className="text-slate-800 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                </button>
                <h1 className="text-lg font-bold text-slate-800">Novo Serviço</h1>
            </div>

            <form onSubmit={handleSalvar} className="px-4 pt-2 pb-6 space-y-1">

                {/* Nome do Serviço */}
                <div className="pt-4">
                    <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Nome do Serviço</label>
                    <input
                        type="text"
                        required
                        placeholder="Ex: Limpeza Completa"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#008080] focus:outline-none transition-colors text-sm"
                    />
                </div>

                {/* Botão Salvar (Verde) */}
                <div className="pt-8">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#2ECC71] hover:bg-[#27ae60] text-white py-3.5 rounded-xl font-bold text-sm tracking-wide shadow-sm active:scale-95 transition-all text-center disabled:opacity-50"
                    >
                        {loading ? 'SALVANDO...' : 'CADASTRAR SERVIÇO'}
                    </button>
                </div>
            </form>
        </main>
    );
}
