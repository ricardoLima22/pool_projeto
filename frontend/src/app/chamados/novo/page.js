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

        const { error } = await supabase
            .from('service_requests')
            .insert([{
                company_id: companyId,
                customer_id: form.customer_id,
                piscineiro_id: form.piscineiro_id,
                service_type_id: form.service_type_id,
                scheduled_date: new Date(form.scheduled_date).toISOString(),
                description: form.description,
                status: form.status
            }]);

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
        <main className="min-h-screen bg-slate-50 p-4 pb-20">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => router.back()} className="text-slate-500 text-2xl">←</button>
                <h1 className="text-xl font-black text-slate-800">Novo Chamado</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-[24px] shadow-sm border border-slate-100 space-y-5">
                
                {/* Cliente */}
                <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Cliente *</label>
                    <select
                        name="customer_id"
                        value={form.customer_id}
                        onChange={handleChange}
                        className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 bg-white"
                        required
                    >
                        <option value="" disabled>Selecione um cliente...</option>
                        {clientes.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                {/* Tipo de Serviço */}
                <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Tipo de Serviço *</label>
                    <select
                        name="service_type_id"
                        value={form.service_type_id}
                        onChange={handleChange}
                        className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 bg-white"
                        required
                    >
                        <option value="" disabled>Selecione o serviço...</option>
                        {servicos.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>

                {/* Funcionário Responsável */}
                <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Atribuir ao Funcionário *</label>
                    <select
                        name="piscineiro_id"
                        value={form.piscineiro_id}
                        onChange={handleChange}
                        className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 bg-white"
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
                </div>

                {/* Data Agendada */}
                <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Data e Hora Agendada *</label>
                    <input
                        type="datetime-local"
                        name="scheduled_date"
                        value={form.scheduled_date}
                        onChange={handleChange}
                        className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 bg-white"
                        required
                    />
                </div>

                {/* Status */}
                <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Status</label>
                    <select
                        name="status"
                        value={form.status}
                        onChange={handleChange}
                        className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 bg-white"
                    >
                        <option value="Pendente">Pendente</option>
                        <option value="Em Andamento">Em Andamento</option>
                        <option value="Concluído">Concluído</option>
                    </select>
                </div>

                {/* Descrição */}
                <div className="space-y-1.5">
                    <label className="text-sm font-bold text-slate-700">Descrição / Observações</label>
                    <textarea
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        rows={4}
                        placeholder="Detalhes adicionais sobre o serviço..."
                        className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 bg-white"
                    />
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-blue-600 text-white font-bold p-4 rounded-xl shadow-lg shadow-blue-200 active:scale-[0.98] transition-all disabled:bg-slate-300 disabled:shadow-none uppercase tracking-wider text-sm"
                    >
                        {submitting ? 'Salvando Chamado...' : 'Abrir Chamado'}
                    </button>
                </div>
            </form>
        </main>
    );
}
