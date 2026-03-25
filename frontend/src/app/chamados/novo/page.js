// src/app/chamados/novo/page.js
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import SplashScreen from '../../../components/SplashScreen';

export default function NovoChamado() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [companyId, setCompanyId] = useState(null);
    const [companySession, setCompanySession] = useState('');

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
        status: 'Pendente',
        address: ''
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

                const { data: companyInfo } = await supabase.from('companies').select('whatsapp_session').eq('id', profile.company_id).single();
                if (companyInfo && companyInfo.whatsapp_session) {
                    setCompanySession(companyInfo.whatsapp_session);
                }

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

        const finalDescription = form.address ? `Endereço: ${form.address}\n\n${form.description}` : form.description;

        const payload = {
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
            company_id: companyId,
            customer_id: form.customer_id,
            piscineiro_id: form.piscineiro_id,
            service_type_id: form.service_type_id,
            scheduled_date: new Date(form.scheduled_date).toISOString(),
            description: finalDescription,
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
            if (companySession) {
                try {
                    const clienteSelecionado = clientes.find(c => c.id === form.customer_id);
                    const servicoSelecionado = servicos.find(s => s.id === form.service_type_id);

                    const botResponse = await fetch('/api/trigger-chamado', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            session_id: companySession,
                            piscineiro_id: form.piscineiro_id,
                            customer_id: form.customer_id,
                            cliente_nome: clienteSelecionado?.name || 'Não informado',
                            status: form.status,
                            data_agendada: form.scheduled_date ? new Date(form.scheduled_date).toLocaleString('pt-BR') : 'Não informada',
                            tipo_servico: servicoSelecionado?.name || 'Geral',
                            descricao: finalDescription
                        })
                    });

                    if (botResponse.ok) {
                        alert('✅ Chamado salvo e notificação enviada para o funcionário pelo WhatsApp!');
                    } else {
                        console.error("Falha ao acionar bot do chamado:", await botResponse.text());
                        alert("⚠️ O chamado foi salvo, mas houve um erro ao notificar o funcionário no WhatsApp.");
                    }
                } catch (err) {
                    console.error("Erro fatal ao acionar bot:", err);
                    alert("⚠️ Chamado salvo, mas o sistema de notificação está inacessível no momento.");
                }
            } else {
                alert("⚠️ Chamado salvo, mas não foi enviada notificação porque a sessão de WhatsApp da empresa não está configurada.");
            }

            router.push('/chamados');
        }
    };

    if (loading) {
        return <SplashScreen message="Carregando informações..." />;
    }

    return (
        <div className="min-h-[100dvh] bg-[#fcfbf8]">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-4 bg-white border-b border-slate-200">
                <button
                    onClick={() => router.back()}
                    className="text-slate-800 hover:text-slate-600 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                </button>
                <h1 className="text-lg font-bold text-slate-800 tracking-wide">Novo Chamado</h1>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-4 pb-6 space-y-1">
                {/* Cliente */}
                <div className="pt-4">
                    <label className="text-[11px] font-semibold tracking-wide text-[#0e5c74] uppercase block">
                        CLIENTE <span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <select
                        required
                        name="customer_id"
                        value={form.customer_id}
                        onChange={handleChange}
                        className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 focus:border-[#0e5c74] focus:outline-none transition-colors text-sm appearance-none"
                    >
                        <option value="">Selecione um cliente...</option>
                        {clientes.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                {/* Endereço */}
                <div className="pt-4">
                    <label className="text-[11px] font-semibold tracking-wide text-[#0e5c74] uppercase block">
                        ENDEREÇO
                    </label>
                    <input
                        type="text"
                        name="address"
                        placeholder="Informe o endereço do serviço..."
                        value={form.address || ''}
                        onChange={handleChange}
                        className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#0e5c74] focus:outline-none transition-colors text-sm"
                    />
                </div>

                {/* Tipo de Serviço */}
                <div className="pt-4">
                    <label className="text-[11px] font-semibold tracking-wide text-[#0e5c74] uppercase block">
                        TIPO DE SERVIÇO <span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <select
                        required
                        name="service_type_id"
                        value={form.service_type_id}
                        onChange={handleChange}
                        className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 focus:border-[#0e5c74] focus:outline-none transition-colors text-sm appearance-none"
                    >
                        <option value="">Selecione o serviço...</option>
                        {servicos.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>

                {/* Funcionário Responsável */}
                <div className="pt-4">
                    <label className="text-[11px] font-semibold tracking-wide text-[#0e5c74] uppercase block">
                        ATRIBUIR AO FUNCIONÁRIO <span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <select
                        required
                        name="piscineiro_id"
                        value={form.piscineiro_id}
                        onChange={handleChange}
                        className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 focus:border-[#0e5c74] focus:outline-none transition-colors text-sm appearance-none"
                    >
                        <option value="">Selecione o funcionário...</option>
                        {funcionarios.map(f => (
                            <option key={f.id} value={f.id}>{f.full_name}</option>
                        ))}
                    </select>
                </div>

                {/* Data Agendada */}
                <div className="pt-4">
                    <label className="text-[11px] font-semibold tracking-wide text-[#0e5c74] uppercase block">
                        DATA E HORA AGENDADA <span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <input
                        type="datetime-local"
                        name="scheduled_date"
                        value={form.scheduled_date}
                        onChange={handleChange}
                        className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#0e5c74] focus:outline-none transition-colors text-sm"
                        required
                    />
                </div>

                {/* Status */}
                <div className="pt-4">
                    <label className="text-[11px] font-semibold tracking-wide text-[#0e5c74] uppercase block">
                        STATUS
                    </label>
                    <select
                        name="status"
                        value={form.status}
                        onChange={handleChange}
                        className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 focus:border-[#0e5c74] focus:outline-none transition-colors text-sm appearance-none"
                    >
                        <option value="Pendente">Pendente</option>
                        <option value="Em Andamento">Em Andamento</option>
                        <option value="Concluido">Concluído</option>
                        <option value="Cancelado">Cancelado</option>
                    </select>
                </div>

                {/* Descrição */}
                <div className="pt-4">
                    <label className="text-[11px] font-semibold tracking-wide text-[#0e5c74] uppercase block">
                        DESCRIÇÃO / OBSERVAÇÕES
                    </label>
                    <textarea
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        placeholder="Detalhes adicionais sobre o serviço..."
                        rows={4}
                        className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#0e5c74] focus:outline-none transition-colors text-sm resize-none"
                        maxLength={1000}
                    />
                </div>

                <div className="pt-8">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-white py-4 rounded-xl font-bold text-sm tracking-wide shadow-sm active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 uppercase"
                    >
                        {submitting ? 'Salvando...' : 'ABRIR CHAMADO'}
                    </button>
                </div>
            </form>
        </div>
    );
}

