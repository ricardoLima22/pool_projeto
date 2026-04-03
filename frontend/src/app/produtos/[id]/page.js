// src/app/produtos/[id]/page.js
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import SplashScreen from '../../../components/SplashScreen';
import { toast } from 'sonner';
import ConfirmDeleteDialog from '../../../components/ConfirmDeleteDialog';

export default function DetalhesProduto() {
    const [produto, setProduto] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editando, setEditando] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [userRole, setUserRole] = useState('');
    const [companyId, setCompanyId] = useState(null);
    const [marcas, setMarcas] = useState([]);

    // Estados do Formulário de Edição
    const [nome, setNome] = useState('');
    const [unidade, setUnidade] = useState('');
    const [preco, setPreco] = useState('');
    const [quantidade, setQuantidade] = useState('');
    const [marcaSelecionada, setMarcaSelecionada] = useState('');

    const params = useParams();
    const router = useRouter();
    const produtoId = params.id;

    useEffect(() => {
        const role = localStorage.getItem('user_role');
        if (role) setUserRole(role.toLowerCase());

        async function init() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('company_id')
                    .eq('id', user.id)
                    .single();
                if (profile) setCompanyId(profile.company_id);
            }

            if (!produtoId) return;
            const { data, error } = await supabase
                .from('products')
                .select('*, brands(name)')
                .eq('id', produtoId)
                .single();

            if (data) {
                setProduto(data);
                setNome(data.name);
                setUnidade(data.unit);
                setPreco(data.price_per_unit || '');
                setQuantidade(data.stock_quantity);
                setMarcaSelecionada(data.brand_id || '');
            }
            setLoading(false);
        }
        init();
    }, [produtoId]);

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

        const nomeLimpo = nome.trim();
        if (nomeLimpo.length < 3) {
            toast.error('Por favor, informe um nome de produto válido com pelo menos 3 letras.');
            return;
        }

        if (quantidade === '' || isNaN(quantidade)) {
            toast.error('Por favor, informe a quantidade de estoque atual.');
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

        setSalvando(true);

        const payload = {
            name: nomeLimpo,
            unit: unidade,
            price_per_unit: precoParsed,
            stock_quantity: qtdParsed,
            brand_id: marcaSelecionada || null
        };

        const { error } = await supabase
            .from('products')
            .update(payload)
            .eq('id', produtoId);

        setSalvando(false);

        if (error) {
            toast.error('Erro ao atualizar: ' + error.message);
        } else {
            // Find brand name to update local state without fetching
            const brandObj = marcas.find(m => m.id === marcaSelecionada);
            
            setProduto({
                ...produto,
                ...payload,
                brands: brandObj ? { name: brandObj.name } : null
            });
            setNome(nomeLimpo);
            setEditando(false);
            toast.success('Produto atualizado com sucesso!');
        }
    };

    const performDelete = async () => {
        setLoading(true);
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', produtoId);

        if (!error) {
            router.push('/produtos');
        } else {
            toast.error('Erro ao remover: ' + error.message);
            setLoading(false);
        }
    };

    const handleDeletar = () => {
        setDeleteDialogOpen(true);
    };

    if (loading) return <SplashScreen message="Carregando detalhes..." />;

    if (!produto) return (
        <main className="min-h-screen bg-[#fcfbf8] p-6 flex flex-col justify-center items-center">
            <p className="text-slate-500 mb-4 text-sm font-medium">Produto não encontrado.</p>
            <button onClick={() => router.push('/produtos')} className="text-white font-bold px-4 py-2 bg-[#008080] rounded-xl text-sm">Voltar à lista</button>
        </main>
    );

    return (
        <main className="min-h-screen bg-[#fcfbf8] pb-24">
            <ConfirmDeleteDialog 
                isOpen={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                onConfirm={performDelete}
                description={`Tem certeza que deseja APAGAR o produto "${produto?.name}"? (Esta ação não pode ser desfeita)`}
            />
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-4 pt-6 bg-white border-b border-slate-200 sticky top-0 z-10">
                <button type="button" onClick={() => router.push('/produtos')} className="text-slate-800 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                </button>
                <h1 className="text-lg font-bold text-slate-800">
                    {editando ? "Editar Produto" : "Detalhes do Produto"}
                </h1>
            </div>

            <div className="px-4 pt-2 pb-6 space-y-1">
                {!editando ? (
                    <div className="space-y-1">
                        <div className="pt-4">
                            <h2 className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Nome do Produto</h2>
                            <p className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 text-sm font-medium">{produto.name}</p>
                        </div>
                        <div className="pt-4">
                            <h2 className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Marca</h2>
                            <p className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 text-sm font-medium">{produto.brands?.name || 'Sem marca'}</p>
                        </div>
                        <div className="pt-4 grid grid-cols-2 gap-6">
                            <div>
                                <h2 className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Unidade</h2>
                                <p className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 text-sm font-medium">{produto.unit}</p>
                            </div>
                            <div>
                                <h2 className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Quantidade</h2>
                                <p className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 text-sm font-medium">{produto.stock_quantity}</p>
                            </div>
                        </div>
                        <div className="pt-4">
                            <h2 className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Custo por Unidade (R$)</h2>
                            <p className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 text-sm font-medium">R$ {parseFloat(produto.price_per_unit || 0).toFixed(2).replace('.', ',')}</p>
                        </div>

                        {userRole !== 'funcionario' && (
                            <div className="pt-8 flex gap-4">
                                <button
                                    onClick={() => setEditando(true)}
                                    className="flex-1 bg-[#2ECC71] hover:bg-[#27ae60] text-white py-3.5 rounded-xl font-bold text-sm tracking-wide shadow-sm active:scale-95 transition-all text-center uppercase"
                                >
                                    Editar Produto
                                </button>
                                <button
                                    onClick={handleDeletar}
                                    className="flex-1 bg-white border border-red-500 text-red-500 hover:bg-red-50 py-3.5 rounded-xl font-bold active:scale-95 transition-all text-sm uppercase text-center"
                                >
                                    Excluir Produto
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <form onSubmit={handleSalvar} className="space-y-1 flex flex-col">
                        <div className="pt-4">
                            <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Nome do Produto</label>
                            <input
                                type="text"
                                required
                                value={nome}
                                onChange={(e) => setNome(e.target.value)}
                                className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#008080] focus:outline-none transition-colors text-sm"
                            />
                        </div>

                        <div className="pt-4">
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block">Marca</label>
                                <button
                                    type="button"
                                    onClick={() => router.push('/marcas/nova')}
                                    className="text-[#008080] hover:text-[#006666] text-xs font-bold uppercase tracking-wide flex items-center gap-1 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                                    Adicionar
                                </button>
                            </div>
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
                                    value={quantidade}
                                    onChange={(e) => setQuantidade(e.target.value)}
                                    className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#008080] focus:outline-none transition-colors text-sm"
                                />
                            </div>
                        </div>

                        <div className="pt-4">
                            <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">Custo por Unidade (R$)</label>
                            <input
                                type="number"
                                step="any"
                                min="0"
                                required
                                value={preco}
                                onChange={(e) => setPreco(e.target.value)}
                                className="w-full border-b-2 border-slate-200 bg-transparent py-3 text-slate-800 placeholder:text-slate-400 focus:border-[#008080] focus:outline-none transition-colors text-sm"
                            />
                        </div>

                        <div className="pt-8 flex gap-4">
                            <button
                                type="button" onClick={() => {
                                    setEditando(false);
                                    setNome(produto.name);
                                    setUnidade(produto.unit);
                                    setPreco(produto.price_per_unit || '');
                                    setQuantidade(produto.stock_quantity);
                                    setMarcaSelecionada(produto.brand_id || '');
                                }} disabled={salvando}
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
