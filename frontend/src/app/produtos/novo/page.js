// src/app/produtos/novo/page.js
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function NovoProduto() {
    const [nome, setNome] = useState('');
    const [unidade, setUnidade] = useState('Litro');
    const [preco, setPreco] = useState('');
    const [quantidade, setQuantidade] = useState('');
    const [companyId, setCompanyId] = useState(null);
    const [marcas, setMarcas] = useState([]);
    const [marcaSelecionada, setMarcaSelecionada] = useState('');
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

    useEffect(() => {
        if (companyId) {
            async function getMarcas() {
                const { data } = await supabase
                    .from('brands')
                    .select('*')
                    .eq('company_id', companyId)
                    .order('name');
                setMarcas(data || []);
            }
            getMarcas();
        }
    }, [companyId]);

    const handleSalvar = async (e) => {
        e.preventDefault();
        if (!companyId) { toast.error('Empresa não encontrada no seu perfil.'); return; }

        const nomeLimpo = nome.trim();
        if (nomeLimpo.length < 3) {
            toast.error('Por favor, informe um nome de produto válido com pelo menos 3 letras.');
            return;
        }

        if (quantidade === '' || isNaN(quantidade)) {
            toast.error('Por favor, informe a quantidade inicial em estoque.');
            return;
        }

        const qtdParsed = parseFloat(quantidade);
        if (qtdParsed < 0) {
            toast.error('A quantidade em estoque não pode ser negativa.');
            return;
        }

        if (preco === '' || isNaN(preco)) {
            toast.error('Por favor, informe o custo por unidade válido.');
            return;
        }

        const precoParsed = parseFloat(preco);
        if (precoParsed < 0) {
            toast.error('O preço de custo não pode ser negativo.');
            return;
        }

        setLoading(true);

        const { error } = await supabase
            .from('products')
            .insert([
                {
                    name: nomeLimpo,
                    unit: unidade,
                    price_per_unit: precoParsed,
                    stock_quantity: qtdParsed,
                    company_id: companyId,
                    brand_id: marcaSelecionada || null
                }
            ]);

        setLoading(false);

        if (error) {
            toast.error('Erro ao salvar produto: ' + error.message);
        } else {
            toast.success('Produto cadastrado com sucesso!');
            router.push('/produtos');
        }
    };

    return (
        <main className="min-h-screen bg-[#fcfbf8] pb-24">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-4 bg-white border-b border-slate-200 sticky top-0 z-10">
                <button type="button" onClick={() => router.back()} className="text-slate-800 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                </button>
                <h1 className="text-lg font-bold text-slate-800">Novo Produto</h1>
            </div>

            <form onSubmit={handleSalvar} className="px-4 pt-2 pb-6 space-y-1">

                {/* Nome do Produto */}
                <div className="pt-4">
                    <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Nome do Produto</label>
                    <input
                        type="text"
                        required
                        placeholder="Ex: Cloro Granulado"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#008080] focus:outline-none transition-colors text-sm"
                    />
                </div>

                {/* Marca (Brand) */}
                <div className="pt-4">
                    <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Marca</label>
                    <select
                        value={marcaSelecionada}
                        onChange={(e) => setMarcaSelecionada(e.target.value)}
                        className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 focus:border-[#008080] focus:outline-none transition-colors text-sm appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '0.65em auto' }}
                    >
                        <option value="">Selecione uma marca...</option>
                        {marcas.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                </div>

                {/* Linha Unidade e Estoque */}
                <div className="pt-4 grid grid-cols-2 gap-6">
                    <div>
                        <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Unidade</label>
                        <select
                            value={unidade}
                            onChange={(e) => setUnidade(e.target.value)}
                            className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 focus:border-[#008080] focus:outline-none transition-colors text-sm appearance-none"
                            style={{ backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '0.65em auto' }}
                        >
                            <option value="Unidade">Unidade (un)</option>
                            <option value="Litro">Litro (L)</option>
                            <option value="Kg">Quilo (kg)</option>
                            <option value="Grama">Grama (g)</option>
                            <option value="ml">Mililitro (ml)</option>
                            <option value="Pastilha">Pastilha</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Quantidade</label>
                        <input
                            type="number"
                            step="1"
                            min="0"
                            required
                            placeholder="Ex: 10"
                            value={quantidade}
                            onChange={(e) => setQuantidade(e.target.value)}
                            className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#008080] focus:outline-none transition-colors text-sm"
                        />
                    </div>
                </div>

                {/* Preço de Custo */}
                <div className="pt-4">
                    <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Custo por {unidade}</label>
                    <div className="relative">
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</span>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            placeholder="0.00"
                            value={preco}
                            onChange={(e) => setPreco(e.target.value)}
                            className="w-full pl-7 pr-4 border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#008080] focus:outline-none transition-colors text-sm"
                        />
                    </div>
                </div>

                {/* Botão Salvar */}
                <div className="pt-8">
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#2ECC71] hover:bg-[#27ae60] text-white py-3.5 rounded-xl font-bold text-sm tracking-wide shadow-sm active:scale-95 transition-all text-center disabled:opacity-50"
                    >
                        {loading ? 'SALVANDO...' : 'CADASTRAR PRODUTO'}
                    </button>
                </div>
            </form>
        </main>
    );
}
