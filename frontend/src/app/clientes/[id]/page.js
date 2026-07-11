// src/app/clientes/[id]/page.js
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import SplashScreen from '../../../components/SplashScreen';
import { toast } from 'sonner';
import ConfirmDeleteDialog from '../../../components/ConfirmDeleteDialog';

export default function DetalhesCliente() {
    const [cliente, setCliente] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editando, setEditando] = useState(false);
    const [nome, setNome] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [email, setEmail] = useState('');
    const [endereco, setEndereco] = useState('');
    const [volume, setVolume] = useState('');
    const [price, setPrice] = useState('');
    const [funcionarioId, setFuncionarioId] = useState('');
    const [tamanhoPiscina, setTamanhoPiscina] = useState('');
    const [diaLimpeza, setDiaLimpeza] = useState('');
    const [funcionarios, setFuncionarios] = useState([]);
    const [salvando, setSalvando] = useState(false);
    const [userRole, setUserRole] = useState('');
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

    const params = useParams();
    const router = useRouter();
    const { id } = params;

    useEffect(() => {
        const role = localStorage.getItem('user_role');
        if (role) setUserRole(role.toLowerCase());

        async function fetchCliente() {
            if (!id) return;

            // Busca o cliente
            const { data } = await supabase
                .from('customers')
                .select('*')
                .eq('id', id)
                .single();

            if (data) {
                setCliente(data);
                setNome(data.name);
                setWhatsapp(data.whatsapp);
                setEmail(data.email || '');
                setEndereco(data.address || '');
                setVolume(data.pool_volume_m3 ?? '');
                setPrice(data.price ?? '');
                setFuncionarioId(data.funcionario_id || '');
                setTamanhoPiscina(data.pool_size || '');
                setDiaLimpeza(data.dia_limpeza || '');

                // Busca funcionários da mesma empresa
                const { data: funcs } = await supabase
                    .from('profiles')
                    .select('id, full_name, roles(name)')
                    .eq('company_id', data.company_id)
                    .eq('roles.name', 'Funcionario');

                const apenasFunc = (funcs || []).filter(
                    (p) => p.roles?.name === 'Funcionario'
                );
                setFuncionarios(apenasFunc);
            }
            setLoading(false);
        }
        fetchCliente();
    }, [id]);

    const performDelete = async () => {
        setLoading(true);
        const { error } = await supabase.from('customers').delete().eq('id', id);
        if (!error) {
            router.push('/clientes');
        } else {
            toast.error('Erro ao excluir: ' + error.message);
            setLoading(false);
        }
    };

    const handleDelete = () => {
        setDeleteDialogOpen(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        
        // Tira todos os espaços vazios do início e do final
        const nomeLimpo = nome.trim();
        if (nomeLimpo.length < 3) {
            toast.error('Por favor, informe um nome de cliente válido com pelo menos 3 letras.');
            return;
        }

        const somenteNumeros = whatsapp.replace(/\D/g, '');
        if (somenteNumeros.length < 10 || somenteNumeros.length > 15) {
            toast.error('Por favor, informe um número de WhatsApp válido contendo DDD (Mínimo de 10 e Máximo de 15 números).');
            return;
        }

        setSalvando(true);
        const { error } = await supabase
            .from('customers')
            .update({
                name: nomeLimpo,
                whatsapp: somenteNumeros,
                email,
                address: endereco,
                pool_volume_m3: parseFloat(volume),
                pool_size: tamanhoPiscina || null,
                price: price !== '' ? parseFloat(price) : null,
                funcionario_id: funcionarioId || null,
                dia_limpeza: diaLimpeza || null
            })
            .eq('id', id);

        if (!error) {
            setCliente({ ...cliente, name: nomeLimpo, whatsapp: somenteNumeros, email, address: endereco, pool_volume_m3: parseFloat(volume), pool_size: tamanhoPiscina || null, price: price !== '' ? parseFloat(price) : null, funcionario_id: funcionarioId || null, dia_limpeza: diaLimpeza || null });
            setNome(nomeLimpo);
            setEditando(false);
            toast.success('Cliente atualizado com sucesso!');
        } else {
            toast.error('Erro ao atualizar: ' + error.message);
        }
        setSalvando(false);
    };

    if (loading) {
        return <SplashScreen message="Carregando detalhes..." />;
    }

    if (!cliente) {
        return (
            <main className="min-h-screen bg-[#fcfbf8] p-6 flex flex-col justify-center items-center">
                <p className="text-slate-500 mb-4 text-sm font-medium">Cliente não encontrado.</p>
                <button onClick={() => router.back()} className="text-white font-bold px-4 py-2 bg-[#008080] rounded-xl text-sm">Voltar à lista</button>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#fcfbf8] pb-24">
            <ConfirmDeleteDialog 
                isOpen={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={performDelete}
                description={`Tem certeza que deseja APAGAR o cliente "${cliente?.name}"? (Esta ação não pode ser desfeita)`}
            />
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-4 pt-6 bg-white border-b border-slate-200 sticky top-0 z-10">
                <button onClick={() => router.push('/clientes')} className="text-slate-800 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                </button>
                <h1 className="text-lg font-bold text-slate-800">
                    {editando ? "Editar Cliente" : "Detalhes do Cliente"}
                </h1>
            </div>

            <div className="px-4 pt-2 pb-6 space-y-1">
                {!editando ? (
                    <div className="space-y-1">
                        <div className="pt-4">
                            <h2 className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Nome</h2>
                            <p className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 text-sm font-medium">{cliente.name}</p>
                        </div>
                        <div className="pt-4">
                            <h2 className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">WhatsApp</h2>
                            <p className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 text-sm font-medium">{cliente.whatsapp || 'Não informado'}</p>
                        </div>
                        <div className="pt-4">
                            <h2 className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">E-mail</h2>
                            <p className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 text-sm font-medium">{cliente.email || 'Não informado'}</p>
                        </div>
                        <div className="pt-4">
                            <h2 className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Endereço</h2>
                            <p className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 text-sm font-medium">{cliente.address || 'Não informado'}</p>
                        </div>
                        <div className="pt-4">
                            <h2 className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Valor (R$)</h2>
                            <p className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 text-sm font-medium">
                                {cliente.price != null ? `R$ ${Number(cliente.price).toFixed(2).replace('.', ',')}` : 'Não informado'}
                            </p>
                        </div>
                        <div className="pt-4">
                            <h2 className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Volume da Piscina (m³)</h2>
                            <div className="w-full border-b-2 border-slate-200 bg-transparent py-3">
                                <p className="text-sm font-bold text-[#3b82f6] bg-blue-50 inline-block px-3 py-1 rounded-md">{cliente.pool_volume_m3} m³</p>
                            </div>
                        </div>
                        <div className="pt-4">
                            <h2 className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Tamanho da Piscina</h2>
                            <p className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 text-sm font-medium">{cliente.pool_size || 'Não informado'}</p>
                        </div>
                        <div className="pt-4">
                            <h2 className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Funcionário Responsável</h2>
                            <p className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 text-sm font-medium">
                                {funcionarios.find(f => f.id === cliente.funcionario_id)?.full_name || 'Não atribuído'}
                            </p>
                        </div>
                        <div className="pt-4">
                            <h2 className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Dia da Limpeza</h2>
                            <p className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 text-sm font-medium">
                                {cliente.dia_limpeza || 'Não informado'}
                            </p>
                        </div>

                        {userRole !== 'funcionario' && (
                            <div className="pt-8 flex gap-4">
                                <button
                                    onClick={() => setEditando(true)}
                                    className="flex-1 bg-[#2ECC71] hover:bg-[#27ae60] text-white py-3.5 rounded-xl font-bold text-sm tracking-wide shadow-sm active:scale-95 transition-all text-center uppercase"
                                >
                                    Editar Cliente
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="flex-1 bg-white border border-red-500 text-red-500 hover:bg-red-50 py-3.5 rounded-xl font-bold active:scale-95 transition-all text-sm uppercase text-center"
                                >
                                    Excluir Cliente
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <form onSubmit={handleUpdate} className="space-y-1 flex flex-col">
                        <div className="pt-4">
                            <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Nome</label>
                            <input
                                required type="text" value={nome} onChange={(e) => setNome(e.target.value)}
                                className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#008080] focus:outline-none transition-colors text-sm"
                            />
                        </div>
                        <div className="pt-4">
                            <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">WhatsApp</label>
                            <input
                                required type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)}
                                className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#008080] focus:outline-none transition-colors text-sm"
                            />
                        </div>
                        <div className="pt-4">
                            <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">E-mail</label>
                            <input
                                required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#008080] focus:outline-none transition-colors text-sm"
                            />
                        </div>
                        <div className="pt-4">
                            <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Endereço</label>
                            <input
                                type="text" value={endereco} onChange={(e) => setEndereco(e.target.value)}
                                className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#008080] focus:outline-none transition-colors text-sm"
                            />
                        </div>
                        <div className="pt-4">
                            <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Valor (R$)</label>
                            <input
                                type="number" step="0.01" min="0" value={price}
                                placeholder="Ex: 150.00"
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '' || Number(val) >= 0) setPrice(val);
                                }}
                                className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#008080] focus:outline-none transition-colors text-sm"
                            />
                        </div>
                        <div className="pt-4">
                            <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Volume (m³)</label>
                            <input
                                required type="number" step="0.1" min="0" value={volume}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === '' || Number(val) >= 0) setVolume(val);
                                }}
                                className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#008080] focus:outline-none transition-colors text-sm"
                            />
                        </div>
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
                        <div className="pt-4">
                            <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Funcionário Responsável</label>
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
                        {/* Dia da Limpeza */}
                        <div className="pt-4">
                            <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Dia da Limpeza</label>
                            <select
                                value={diaLimpeza}
                                onChange={(e) => setDiaLimpeza(e.target.value)}
                                className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 focus:border-[#008080] focus:outline-none transition-colors text-sm appearance-none"
                                style={{ backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2394a3b8%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.4-12.8z%22%2F%3E%3C%2Fsvg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '0.65em auto' }}
                            >
                                <option value="">Selecione o dia...</option>
                                <option value="Segunda-feira">Segunda-feira</option>
                                <option value="Terça-feira">Terça-feira</option>
                                <option value="Quarta-feira">Quarta-feira</option>
                                <option value="Quinta-feira">Quinta-feira</option>
                                <option value="Sexta-feira">Sexta-feira</option>
                                <option value="Sábado">Sábado</option>
                                <option value="Domingo">Domingo</option>
                            </select>
                        </div>

                        <div className="pt-8 flex gap-4">
                            <button
                                type="button" onClick={() => setEditando(false)} disabled={salvando}
                                className="flex-1 bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 py-3.5 rounded-xl font-bold active:scale-95 transition-all text-sm uppercase text-center"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit" disabled={salvando}
                                className="flex-1 bg-[#2ECC71] hover:bg-[#27ae60] text-white py-3.5 rounded-xl font-bold tracking-wide shadow-sm active:scale-95 transition-all text-sm uppercase text-center"
                            >
                                {salvando ? 'Salvando...' : 'Salvar Alterações'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </main>
    );
}
