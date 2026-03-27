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
                    .select('id, name, address')
                    .eq('company_id', profile.company_id)
                    .order('name');
                setClientes(cRes.data || []);

                // 2. Cargos e Funcionários separados para cruzar os dados exatos (Garante que só Funcionario apareça)
                const { data: allRoles } = await supabase.from('roles').select('id, name');

                const pRes = await supabase
                    .from('profiles')
                    .select('id, full_name, role_id') // puxamos agora o role_id diretamente
                    .eq('company_id', profile.company_id)
                    .order('full_name');
                
                // Filtramos SOMENTE quem o banco de dados confirma que é da tabela de Funcionarios
                const funcList = (pRes.data || []).filter(p => {
                    const cargoDela = allRoles?.find(r => r.id === p.role_id);
                    return cargoDela && cargoDela.name === 'Funcionario';
                });
                
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
        const { name, value } = e.target;
        if (name === 'customer_id') {
            const cliente = clientes.find(c => c.id === value);
            setForm(prev => ({ ...prev, customer_id: value, address: cliente?.address || '' }));
        } else {
            setForm(prev => ({ ...prev, [name]: value }));
        }
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

        const finalDescription = form.description || '';

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
        
        if (process.env.NODE_ENV === 'development') {
            console.log("Enviando pro banco:", payload);
        }

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
        <main className="min-h-screen bg-[#fcfbf8] pb-24">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-4 bg-white border-b border-slate-200 sticky top-0 z-10">
                <button onClick={() => router.back()} className="text-slate-800 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                </button>
                <h1 className="text-lg font-bold text-slate-800">Novo Chamado</h1>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-4 pt-2 pb-6 space-y-1">
                {/* Cliente */}
                <div className="pt-4">
                    <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">
                        CLIENTE <span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <select
                        required
                        name="customer_id"
                        value={form.customer_id}
                        onChange={handleChange}
                        className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 focus:border-[#008080] focus:outline-none transition-colors text-sm rounded-none appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '0.65em auto' }}
                    >
                        <option value="">Selecione um cliente...</option>
                        {clientes.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                {/* Endereço */}
                <div className="pt-4">
                    <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">
                        ENDEREÇO
                    </label>
                    <input
                        type="text"
                        name="address"
                        placeholder="Endereço não cadastrado"
                        value={form.address || ''}
                        readOnly
                        className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-500 placeholder:text-slate-400 focus:outline-none text-sm rounded-none appearance-none cursor-not-allowed"
                    />
                </div>

                {/* Tipo de Serviço */}
                <div className="pt-4">
                    <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block">
                            TIPO DE SERVIÇO <span className="text-red-500 ml-0.5">*</span>
                        </label>
                        <button
                            type="button"
                            onClick={() => router.push('/servicos/novo')}
                            className="text-[#008080] hover:text-[#006666] text-xs font-bold uppercase tracking-wide flex items-center gap-1 transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                            Adicionar
                        </button>
                    </div>
                    <select
                        required
                        name="service_type_id"
                        value={form.service_type_id}
                        onChange={handleChange}
                        className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 focus:border-[#008080] focus:outline-none transition-colors text-sm rounded-none appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '0.65em auto' }}
                    >
                        <option value="">Selecione o serviço...</option>
                        {servicos.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </div>

                {/* Funcionário Responsável */}
                <div className="pt-4">
                    <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">
                        ATRIBUIR AO FUNCIONÁRIO <span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <select
                        required
                        name="piscineiro_id"
                        value={form.piscineiro_id}
                        onChange={handleChange}
                        className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 focus:border-[#008080] focus:outline-none transition-colors text-sm rounded-none appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '0.65em auto' }}
                    >
                        <option value="">Selecione o funcionário...</option>
                        {funcionarios.map(f => (
                            <option key={f.id} value={f.id}>{f.full_name}</option>
                        ))}
                    </select>
                </div>

                {/* Data Agendada */}
                <div className="pt-4">
                    <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">
                        DATA E HORA AGENDADA <span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <input
                        type="datetime-local"
                        name="scheduled_date"
                        value={form.scheduled_date}
                        onChange={handleChange}
                        className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#008080] focus:outline-none transition-colors text-sm rounded-none appearance-none"
                        required
                    />
                </div>

                {/* Status */}
                <div className="pt-4">
                    <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">
                        STATUS
                    </label>
                    <select
                        name="status"
                        value={form.status}
                        onChange={handleChange}
                        className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 focus:border-[#008080] focus:outline-none transition-colors text-sm rounded-none appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '0.65em auto' }}
                    >
                        <option value="Pendente">Pendente</option>
                        <option value="Concluido">Concluído</option>
                        <option value="Cancelado">Cancelado</option>
                    </select>
                </div>

                {/* Descrição */}
                <div className="pt-4">
                    <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">
                        DESCRIÇÃO / OBSERVAÇÕES
                    </label>
                    <textarea
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        placeholder="Detalhes adicionais sobre o serviço..."
                        rows={4}
                        className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#008080] focus:outline-none transition-colors text-sm resize-none rounded-none appearance-none"
                        maxLength={1000}
                    />
                </div>

                <div className="pt-8">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-[#2ECC71] hover:bg-[#27ae60] text-white py-3.5 rounded-xl font-bold text-sm tracking-wide shadow-sm active:scale-95 transition-all text-center"
                    >
                        {submitting ? 'SALVANDO...' : 'CADASTRAR CHAMADO'}
                    </button>
                </div>
            </form>
        </main>
    );
}
