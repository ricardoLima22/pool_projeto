// src/app/servicos/novo/page.js
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function NovoServico() {
    const [nome, setNome] = useState('');
    const [descricao, setDescricao] = useState('');
    const [preco, setPreco] = useState('');
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
            .from('services')
            .insert([
                {
                    name: nome,
                    description: descricao || null,
                    base_price: parseFloat(preco) || 0,
                    company_id: companyId
                }
            ]);

        setLoading(false);

        if (error) {
            alert("Erro ao salvar serviço. Verifique se a tabela 'services' existe no Supabase. Detalhe: " + error.message);
        } else {
            // Volta para a página anterior (ou lista de serviços futuramente)
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

                {/* Descrição */}
                <div className="pt-4">
                    <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Descrição (Opcional)</label>
                    <textarea
                        placeholder="Ex: Escovação, aspiração e aplicação de cloro."
                        value={descricao}
                        onChange={(e) => setDescricao(e.target.value)}
                        className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#008080] focus:outline-none transition-colors text-sm resize-none h-20"
                    />
                </div>

                {/* Preço Base */}
                <div className="pt-4">
                    <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Valor Padrão</label>
                    <div className="relative">
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            placeholder="150.00"
                            value={preco}
                            onChange={(e) => setPreco(e.target.value)}
                            className="w-full pl-7 pr-4 border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#008080] focus:outline-none transition-colors text-sm"
                        />
                    </div>
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
