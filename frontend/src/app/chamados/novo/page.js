// src/app/chamados/novo/page.js
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function NovoChamado() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [companyId, setCompanyId] = useState(null);

    // Listas para os ComboBoxes
    const [clientes, setClientes] = useState([]);
    const [funcionarios, setFuncionarios] = useState([]);
    const [servicos, setServicos] = useState([]);

    // Campos do formulário
    const [form, setForm] = useState({
        customer_id: '',
        piscineiro_id: '',
        service_type_id: '',
        scheduled_date: '',
        description: '',
        status: 'Pendente'
    });

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user.id)
                .single();

            if (profile?.company_id) {
                setCompanyId(profile.company_id);

                // 1. Clientes
                const cRes = await supabase
                    .from('customers')
                    .select('id, name')
                    .eq('company_id', profile.company_id)
                    .order('name');
                setClientes(cRes.data || []);

                // 2. Funcionários. Trazemos o nome da role para filtrar só quem é Funcionario
                const pRes = await supabase
                    .from('profiles')
                    .select('id, full_name, roles(name)')
                    .eq('company_id', profile.company_id)
                    .order('full_name');
                
                // Filtramos apenas quem tem o role "Funcionario" (case insensitive caso o banco seja diferente)
                const funcList = (pRes.data || []).filter(p => !Array.isArray(p.roles) && p.roles?.name?.toLowerCase() === 'funcionario' || (Array.isArray(p.roles) && p.roles[0]?.name?.toLowerCase() === 'funcionario'));
                setFuncionarios(funcList);

                // 3. Tipos de Serviço
                const tRes = await supabase
                    .from('service_types')
                    .select('id, name')
                    .eq('company_id', profile.company_id)
                    // .eq('active', true) // Pode habilitar se houver esse comportamento
                    .order('name');
                setServicos(tRes.data || []);
            }
        }
        setLoading(false);
    }

    const handleChange = (e) => {
        setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        // Verificações simples
        if (!form.customer_id || !form.service_type_id || !form.piscineiro_id || !form.scheduled_date) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            setSubmitting(false);
            return;
        }

        const payload = {
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
            company_id: companyId,
            customer_id: form.customer_id,
            piscineiro_id: form.piscineiro_id,
            service_type_id: form.service_type_id,
            scheduled_date: new Date(form.scheduled_date).toISOString(),
            description: form.description,
            status: form.status
        };
        
        console.log("Enviando pro banco:", payload);

        const { error } = await supabase
            .from('service_requests')
            .insert([payload]);

        if (error) {
            console.error("Erro ao inserir chamado:", error);
            alert(`Erro do banco: ${error.message || JSON.stringify(error)}`);
            setSubmitting(false);
        } else {
            router.push('/chamados');
        }
    };

    if (loading) {
        return <p className="text-center py-10 text-slate-400 animate-pulse">Carregando informações...</p>;
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <div
                className="px-4 py-4"
                style={{
                    background: "linear-gradient(135deg, hsl(195 60% 18%), hsl(180 40% 28%))",
                }}
            >
                <div className="max-w-2xl mx-auto flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="text-white hover:text-white/80 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                    </button>
                    <h1 className="text-lg font-bold text-white tracking-wide">Novo Chamado</h1>
                </div>
            </div>

            <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full space-y-5 pb-28">
                <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5 shadow-sm">
                    {/* Cliente */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block">
                            Cliente <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <select
                                name="customer_id"
                                value={form.customer_id}
                                onChange={handleChange}
                                className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 shadow-sm appearance-none"
                                required
                            >
                                <option value="" disabled>Selecione um cliente...</option>
                                {clientes.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            <svg className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                        </div>
                    </div>

                    {/* Tipo de Serviço */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block">
                            Tipo de Serviço <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <select
                                name="service_type_id"
                                value={form.service_type_id}
                                onChange={handleChange}
                                className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 shadow-sm appearance-none"
                                required
                            >
                                <option value="" disabled>Selecione o serviço...</option>
                                {servicos.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                            <svg className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                        </div>
                    </div>

                    {/* Funcionário Responsável */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block">
                            Atribuir ao Funcionário <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <select
                                name="piscineiro_id"
                                value={form.piscineiro_id}
                                onChange={handleChange}
                                className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 shadow-sm appearance-none"
                                required
                            >
                                <option value="" disabled>Selecione o funcionário...</option>
                                {funcionarios.map(f => (
                                    <option key={f.id} value={f.id}>{f.full_name}</option>
                                ))}
                                {funcionarios.length === 0 && (
                                    <option value="" disabled>⚠️ Nenhum funcionário encontrado</option>
                                )}
                            </select>
                            <svg className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                        </div>
                    </div>

                    {/* Data Agendada */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block">
                            Data e Hora Agendada <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="datetime-local"
                            name="scheduled_date"
                            value={form.scheduled_date}
                            onChange={handleChange}
                            className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 shadow-sm"
                            required
                        />
                    </div>

                    {/* Status */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block">Status</label>
                        <div className="relative">
                            <select
                                name="status"
                                value={form.status}
                                onChange={handleChange}
                                className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 shadow-sm appearance-none"
                            >
                                <option value="Pendente">Pendente</option>
                                <option value="Em andamento">Em andamento</option>
                                <option value="Concluido">Concluído</option>
                                <option value="Cancelado">Cancelado</option>
                            </select>
                            <svg className="absolute right-3 top-3 h-4 w-4 opacity-50 pointer-events-none" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                        </div>
                    </div>

                    {/* Descrição */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block">Descrição / Observações</label>
                        <textarea
                            name="description"
                            value={form.description}
                            onChange={handleChange}
                            placeholder="Detalhes adicionais sobre o serviço..."
                            className="flex min-h-[120px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-slate-400 shadow-sm resize-none"
                            maxLength={1000}
                        />
                    </div>
                </form>
            </main>

            {/* Footer */}
            <div className="fixed bottom-0 left-0 right-0 px-4 py-4 bg-slate-50 border-t border-slate-200 z-10 shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.05)]">
                <div className="max-w-2xl mx-auto">
                    <button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="w-full bg-[#2ECC71] hover:bg-[#27ae60] text-white py-3.5 rounded-xl font-bold text-sm tracking-wide shadow-sm active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 uppercase"
                    >
                        {submitting ? 'Salvando...' : 'ABRIR CHAMADO'}
                    </button>
                </div>
            </div>
        </div>
    );
}
