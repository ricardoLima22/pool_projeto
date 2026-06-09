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
    const [tamanhoPiscina, setTamanhoPiscina] = useState('');
    const [price, setPrice] = useState('');
    const [funcionarios, setFuncionarios] = useState([]);
    const [funcionarioId, setFuncionarioId] = useState('');
    const [companyId, setCompanyId] = useState(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // 1. Ao carregar a tela, pegamos o ID da empresa e buscamos os funcionários
    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Pega o company_id do usuário logado
            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user.id)
                .single();

                
            if (profile) {
                setCompanyId(profile.company_id);

                // Busca apenas perfis com role = 'Funcionario' da mesma empresa
                const { data: funcs } = await supabase
                    .from('profiles')
                    .select('id, full_name, roles(name)')
                    .eq('company_id', profile.company_id)
                    .eq('roles.name', 'Funcionario');

                // Filtra no cliente para garantir apenas a role correta
                const apenasFunc = (funcs || []).filter(
                    (p) => p.roles?.name === 'Funcionario'
                );
                setFuncionarios(apenasFunc);
            }
        }
        init();
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
                    price: price !== '' ? parseFloat(price) : null,
                    pool_volume_m3: parseFloat(volume),
                    pool_size: tamanhoPiscina,
                    company_id: companyId,
                    piscineiro_id: user?.id,
                    funcionario_id: funcionarioId || null
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
                    <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Valor (R$)</label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Ex: 150.00"
                        className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#008080] focus:outline-none transition-colors text-sm rounded-none appearance-none"
                        onChange={(e) => {
                            const val = e.target.value;
                            if (val === '' || Number(val) >= 0) {
                                setPrice(val);
                            }
                        }}
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

                {/* Tamanho da Piscina */}
                <div className="pt-4">
                    <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Tamanho da Piscina</label>
                    <select
                        required
                        value={tamanhoPiscina}
                        onChange={(e) => setTamanhoPiscina(e.target.value)}
                        className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 focus:border-[#008080] focus:outline-none transition-colors text-sm appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '0.65em auto' }}
                    >
                        <option value="" disabled>Selecione o tamanho...</option>
                        <option value="Normal">Normal</option>
                        <option value="Grande">Grande</option>
                    </select>
                </div>

                {/* Funcionário Responsável */}
                <div className="pt-4">
                    <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Funcionário Responsável (Opcional)</label>
                    <select
                        value={funcionarioId}
                        onChange={(e) => setFuncionarioId(e.target.value)}
                        className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 focus:border-[#008080] focus:outline-none transition-colors text-sm appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '0.65em auto' }}
                    >
                        <option value="">Selecione um funcionário...</option>
                        {funcionarios.map((f) => (
                            <option key={f.id} value={f.id}>{f.full_name}</option>
                        ))}
                    </select>
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
