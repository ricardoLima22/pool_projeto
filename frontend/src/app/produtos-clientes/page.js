'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import SplashScreen from '../../components/SplashScreen';
import {
    loadCustomerProductsData,
    setCustomerProductPresence,
    assignCustomerToEmployee,
} from '../../services/customerProducts';
import {
    ArrowLeft,
    Search,
    Package,
    Users,
    CheckSquare,
    ChevronDown,
    Check,
    User,
    Loader2,
    UserCheck,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ProdutosNosClientesPage() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [companyId, setCompanyId] = useState('');
    const [isDono, setIsDono] = useState(false);
    const [customers, setCustomers] = useState([]);
    const [products, setProducts] = useState([]);
    const [employees, setEmployees] = useState([]);

    // Pesquisa e filtros
    const [busca, setBusca] = useState('');
    const [filtroProdutos, setFiltroProdutos] = useState('TODOS'); // 'TODOS' | 'COM_PRODUTOS' | 'SEM_PRODUTOS'
    const [filtroFuncionario, setFiltroFuncionario] = useState('');

    // Controle de cards expandidos e salvamento em andamento
    const [expandedIds, setExpandedIds] = useState({});
    const [savingKeys, setSavingKeys] = useState({});
    const [assigningCustomerId, setAssigningCustomerId] = useState(null);

    useEffect(() => {
        let active = true;

        async function init() {
            try {
                const data = await loadCustomerProductsData();
                if (!active) return;

                if (!data) {
                    router.push('/login');
                    return;
                }

                setCompanyId(data.companyId);
                setIsDono(data.isDono);
                setCustomers(data.customers);
                setProducts(data.products);
                setEmployees(data.employees);
            } catch (err) {
                console.error('Erro ao carregar Produtos nos Clientes:', err);
                toast.error(err?.message || 'Erro ao carregar dados.');
            } finally {
                if (active) setLoading(false);
            }
        }

        init();
        return () => {
            active = false;
        };
    }, [router]);

    const toggleExpand = (customerId) => {
        setExpandedIds((prev) => ({
            ...prev,
            [customerId]: !prev[customerId],
        }));
    };

    // Handler para marcar/desmarcar produto na residência do cliente (salvamento automático)
    const handleToggleProduct = async (customerId, productId, currentlyPresent) => {
        const key = `${customerId}_${productId}`;
        if (savingKeys[key]) return;

        const nextPresent = !currentlyPresent;

        // Atualização otimista imediata
        setCustomers((prev) =>
            prev.map((c) => {
                if (c.id !== customerId) return c;
                const currentSet = new Set(c.productIds || []);
                if (nextPresent) {
                    currentSet.add(productId);
                } else {
                    currentSet.delete(productId);
                }
                return {
                    ...c,
                    productIds: Array.from(currentSet),
                };
            })
        );

        setSavingKeys((prev) => ({ ...prev, [key]: true }));

        try {
            await setCustomerProductPresence({
                customerId,
                productId,
                companyId,
                present: nextPresent,
            });
        } catch (err) {
            // Reverte em caso de erro de autorização ou falha de rede
            setCustomers((prev) =>
                prev.map((c) => {
                    if (c.id !== customerId) return c;
                    const currentSet = new Set(c.productIds || []);
                    if (currentlyPresent) {
                        currentSet.add(productId);
                    } else {
                        currentSet.delete(productId);
                    }
                    return {
                        ...c,
                        productIds: Array.from(currentSet),
                    };
                })
            );
            toast.error(err?.message || 'Não foi possível salvar a alteração.');
        } finally {
            setSavingKeys((prev) => {
                const next = { ...prev };
                delete next[key];
                return next;
            });
        }
    };

    // Handler para o Dono designar ou remover cliente de um funcionário
    const handleDesignarFuncionario = async (customerId, novoFuncionarioId) => {
        if (!isDono) {
            toast.error('Apenas o dono pode alterar a designação de clientes.');
            return;
        }

        const targetFuncId = novoFuncionarioId || null;
        const empObj = employees.find((e) => e.id === targetFuncId);
        const targetFuncName = empObj ? empObj.full_name : null;

        const clienteAnterior = customers.find((c) => c.id === customerId);
        const prevFuncId = clienteAnterior?.funcionario_id || null;
        const prevFuncName = clienteAnterior?.funcionario_name || null;

        setAssigningCustomerId(customerId);

        // Atualização otimista
        setCustomers((prev) =>
            prev.map((c) =>
                c.id === customerId
                    ? { ...c, funcionario_id: targetFuncId, funcionario_name: targetFuncName }
                    : c
            )
        );

        try {
            await assignCustomerToEmployee(customerId, targetFuncId);
            toast.success(
                targetFuncName
                    ? `Cliente designado para ${targetFuncName}.`
                    : 'Designação de funcionário removida.'
            );
        } catch (err) {
            // Rollback
            setCustomers((prev) =>
                prev.map((c) =>
                    c.id === customerId
                        ? { ...c, funcionario_id: prevFuncId, funcionario_name: prevFuncName }
                        : c
                )
            );
            toast.error(err?.message || 'Erro ao atualizar designação do cliente.');
        } finally {
            setAssigningCustomerId(null);
        }
    };

    // Base filtrada pelo funcionário selecionado (apenas quando Dono filtra por funcionário)
    const customersBase = useMemo(() => {
        if (!isDono || !filtroFuncionario) return customers;
        if (filtroFuncionario === '__sem_funcionario__') {
            return customers.filter((c) => !c.funcionario_id);
        }
        return customers.filter((c) => c.funcionario_id === filtroFuncionario);
    }, [customers, isDono, filtroFuncionario]);

    // Indicadores gerais
    const indicadores = useMemo(() => {
        const totalClientes = customersBase.length;
        let clientesComProdutos = 0;
        let totalProdutosMarcados = 0;

        for (const c of customersBase) {
            const count = c.productIds?.length || 0;
            if (count > 0) clientesComProdutos += 1;
            totalProdutosMarcados += count;
        }

        return {
            totalClientes,
            clientesComProdutos,
            clientesSemProdutos: totalClientes - clientesComProdutos,
            totalProdutosMarcados,
        };
    }, [customersBase]);

    // Lista final após busca por nome + filtro de presença de produtos
    const clientesFiltrados = useMemo(() => {
        const termo = busca.trim().toLowerCase();

        return customersBase.filter((c) => {
            const matchNome = !termo || (c.name || '').toLowerCase().includes(termo);
            if (!matchNome) return false;

            const qtd = c.productIds?.length || 0;
            if (filtroProdutos === 'COM_PRODUTOS') return qtd > 0;
            if (filtroProdutos === 'SEM_PRODUTOS') return qtd === 0;
            return true;
        });
    }, [customersBase, busca, filtroProdutos]);

    // Mapa auxiliar de produtos por ID para exibir nomes rápidos
    const productById = useMemo(() => {
        const map = {};
        for (const p of products) {
            map[p.id] = p;
        }
        return map;
    }, [products]);

    if (loading) {
        return <SplashScreen message="Carregando produtos nos clientes..." />;
    }

    return (
        <main className="min-h-screen bg-[#fcfbf8] pb-24">
            {/* Header */}
            <header className="px-4 py-4 pt-6 flex items-center justify-between bg-white border-b border-slate-200 sticky top-0 z-20">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => router.push(isDono ? '/home' : '/funcionario')}
                        className="text-slate-800 transition-colors"
                        aria-label="Voltar"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800 leading-tight">
                            Produtos nos Clientes
                        </h1>
                        <p className="text-xs text-slate-500">
                            {isDono
                                ? 'Visão completa de todos os clientes'
                                : 'Clientes designados a você'}
                        </p>
                    </div>
                </div>

                {isDono && (
                    <button
                        type="button"
                        onClick={() => router.push('/produtos')}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold text-[#008080] bg-teal-50 border border-teal-200/80 hover:bg-teal-100 transition-colors"
                    >
                        <Package className="w-3.5 h-3.5" />
                        Estoque
                    </button>
                )}
            </header>

            <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
                {/* Indicadores */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 text-center flex flex-col justify-center">
                        <div className="flex justify-center text-blue-500 mb-1">
                            <Users className="w-4 h-4" />
                        </div>
                        <span className="text-lg font-black text-slate-800">
                            {indicadores.totalClientes}
                        </span>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                            Total Clientes
                        </p>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 text-center flex flex-col justify-center">
                        <div className="flex justify-center text-emerald-500 mb-1">
                            <Package className="w-4 h-4" />
                        </div>
                        <span className="text-lg font-black text-emerald-600">
                            {indicadores.clientesComProdutos}
                        </span>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                            Com Produtos
                        </p>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3 text-center flex flex-col justify-center">
                        <div className="flex justify-center text-[#008080] mb-1">
                            <CheckSquare className="w-4 h-4" />
                        </div>
                        <span className="text-lg font-black text-[#008080]">
                            {indicadores.totalProdutosMarcados}
                        </span>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                            Produtos Marcados
                        </p>
                    </div>
                </div>

                {/* Pesquisa por nome do cliente */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar cliente pelo nome..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        className="w-full pl-9 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#008080]/40 transition-colors shadow-sm"
                    />
                </div>

                {/* Filtro por funcionário — visível apenas para o Dono */}
                {isDono && employees.length > 0 && (
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        <select
                            value={filtroFuncionario}
                            onChange={(e) => setFiltroFuncionario(e.target.value)}
                            className="w-full pl-9 pr-9 py-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:border-[#008080]/40 transition-colors shadow-sm appearance-none cursor-pointer"
                        >
                            <option value="">Todos os funcionários</option>
                            <option value="__sem_funcionario__">Sem funcionário atribuído</option>
                            {employees.map((f) => (
                                <option key={f.id} value={f.id}>
                                    {f.full_name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                    </div>
                )}

                {/* Filtros: Todos / Clientes com produtos / Clientes sem produtos */}
                <div className="bg-white rounded-xl border border-slate-200 p-1 flex gap-1 shadow-sm">
                    <button
                        type="button"
                        onClick={() => setFiltroProdutos('TODOS')}
                        className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg transition-all ${
                            filtroProdutos === 'TODOS'
                                ? 'bg-[#008080] text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        Todos ({indicadores.totalClientes})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFiltroProdutos('COM_PRODUTOS')}
                        className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg transition-all ${
                            filtroProdutos === 'COM_PRODUTOS'
                                ? 'bg-[#008080] text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        Com produtos ({indicadores.clientesComProdutos})
                    </button>
                    <button
                        type="button"
                        onClick={() => setFiltroProdutos('SEM_PRODUTOS')}
                        className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg transition-all ${
                            filtroProdutos === 'SEM_PRODUTOS'
                                ? 'bg-[#008080] text-white shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        Sem produtos ({indicadores.clientesSemProdutos})
                    </button>
                </div>

                {/* Listagem de Clientes em Cards Expansíveis */}
                <div className="space-y-3">
                    {clientesFiltrados.map((cliente) => {
                        const markedIds = cliente.productIds || [];
                        const markedSet = new Set(markedIds);
                        const qtd = markedIds.length;
                        const isExpanded = !!expandedIds[cliente.id];
                        const labelQtd = `${qtd} ${qtd === 1 ? 'produto' : 'produtos'}`;

                        return (
                            <div
                                key={cliente.id}
                                className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden transition-all"
                            >
                                {/* Cabeçalho do Card (Expansível) */}
                                <button
                                    type="button"
                                    onClick={() => toggleExpand(cliente.id)}
                                    className="w-full p-4 text-left hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-3"
                                >
                                    <div className="min-w-0 flex-1 space-y-1">
                                        <div className="flex items-center flex-wrap gap-x-2 gap-y-1">
                                            <p className="font-bold text-slate-800 text-sm sm:text-base truncate">
                                                {cliente.name} —{' '}
                                                <span
                                                    className={
                                                        qtd > 0
                                                            ? 'text-[#008080]'
                                                            : 'text-slate-400 font-semibold'
                                                    }
                                                >
                                                    {labelQtd}
                                                </span>
                                            </p>
                                        </div>

                                        {isDono && (
                                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                                                <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                                                    <User className="w-3 h-3 text-[#008080] shrink-0" />
                                                    {cliente.funcionario_name || 'Sem funcionário'}
                                                </span>
                                            </div>
                                        )}

                                        {/* Resumo rápido dos produtos presentes quando o card está fechado */}
                                        {!isExpanded && qtd > 0 && (
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                {markedIds.map((pid) => {
                                                    const prod = productById[pid];
                                                    if (!prod) return null;
                                                    return (
                                                        <span
                                                            key={pid}
                                                            className="inline-flex items-center gap-1 text-[10px] font-semibold bg-teal-50 text-[#008080] border border-teal-200/70 px-2 py-0.5 rounded-full"
                                                        >
                                                            <Check className="w-2.5 h-2.5" />
                                                            {prod.name}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                        <span
                                            className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                                                qtd > 0
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                    : 'bg-slate-100 text-slate-500 border-slate-200'
                                            }`}
                                        >
                                            {labelQtd}
                                        </span>
                                        <ChevronDown
                                            className={`h-5 w-5 text-[#008080] transition-transform duration-200 ${
                                                isExpanded ? 'rotate-180' : ''
                                            }`}
                                        />
                                    </div>
                                </button>

                                {/* Corpo Expandido: Designação (para o Dono) + Checkboxes de Produtos */}
                                {isExpanded && (
                                    <div className="px-4 pb-4 pt-3 border-t border-slate-100 bg-slate-50/40 space-y-4">
                                        {/* Controle de designação de funcionário — exclusivo para o Dono */}
                                        {isDono && (
                                            <div className="bg-white rounded-xl p-3 border border-slate-200/80 shadow-xs">
                                                <label className="text-[10px] font-bold tracking-wider text-[#008080] uppercase flex items-center gap-1.5 mb-1.5">
                                                    <UserCheck className="w-3.5 h-3.5" />
                                                    Funcionário Responsável pelo Cliente
                                                </label>
                                                <div className="relative">
                                                    <select
                                                        value={cliente.funcionario_id || ''}
                                                        disabled={assigningCustomerId === cliente.id}
                                                        onChange={(e) =>
                                                            handleDesignarFuncionario(
                                                                cliente.id,
                                                                e.target.value
                                                            )
                                                        }
                                                        className="w-full pr-8 pl-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 focus:outline-none focus:border-[#008080] transition-colors appearance-none cursor-pointer disabled:opacity-60"
                                                    >
                                                        <option value="">
                                                            Sem funcionário (remover designação)
                                                        </option>
                                                        {employees.map((emp) => (
                                                            <option key={emp.id} value={emp.id}>
                                                                {emp.full_name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                                                </div>
                                            </div>
                                        )}

                                        {/* Lista de Produtos com Checkboxes */}
                                        <div>
                                            <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-2">
                                                Produtos na residência deste cliente
                                            </p>

                                            {products.length === 0 ? (
                                                <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
                                                    <p className="text-xs text-slate-400">
                                                        Nenhum produto cadastrado na empresa.
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {products.map((produto) => {
                                                        const isChecked = markedSet.has(produto.id);
                                                        const isSaving =
                                                            !!savingKeys[
                                                                `${cliente.id}_${produto.id}`
                                                            ];

                                                        return (
                                                            <button
                                                                key={produto.id}
                                                                type="button"
                                                                disabled={isSaving}
                                                                onClick={() =>
                                                                    handleToggleProduct(
                                                                        cliente.id,
                                                                        produto.id,
                                                                        isChecked
                                                                    )
                                                                }
                                                                role="checkbox"
                                                                aria-checked={isChecked}
                                                                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all active:scale-[0.99] ${
                                                                    isChecked
                                                                        ? 'bg-teal-50/70 border-[#008080]/40 shadow-xs'
                                                                        : 'bg-white border-slate-200 hover:border-slate-300'
                                                                } ${isSaving ? 'opacity-70' : ''}`}
                                                            >
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    {/* Checkbox */}
                                                                    <div
                                                                        className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 border transition-colors ${
                                                                            isChecked
                                                                                ? 'bg-[#008080] border-[#008080] text-white'
                                                                                : 'bg-white border-slate-300'
                                                                        }`}
                                                                    >
                                                                        {isSaving ? (
                                                                            <Loader2 className="w-3.5 h-3.5 animate-spin text-current" />
                                                                        ) : isChecked ? (
                                                                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                                                                        ) : null}
                                                                    </div>

                                                                    <div className="min-w-0">
                                                                        <p
                                                                            className={`text-sm font-semibold truncate ${
                                                                                isChecked
                                                                                    ? 'text-slate-900'
                                                                                    : 'text-slate-700'
                                                                            }`}
                                                                        >
                                                                            {produto.name}
                                                                        </p>
                                                                        {produto.brand_name && (
                                                                            <p className="text-[11px] text-slate-400 truncate">
                                                                                {produto.brand_name}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                <span
                                                                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md shrink-0 ${
                                                                        isChecked
                                                                            ? 'bg-[#008080]/10 text-[#008080]'
                                                                            : 'text-slate-400'
                                                                    }`}
                                                                >
                                                                    {isChecked ? 'Presente' : 'Ausente'}
                                                                </span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {clientesFiltrados.length === 0 && (
                        <div className="bg-white rounded-xl border border-slate-100 p-8 text-center shadow-sm">
                            <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                            <p className="text-slate-600 font-semibold text-sm">
                                Nenhum cliente encontrado.
                            </p>
                            <p className="text-slate-400 text-xs mt-1">
                                {busca || filtroProdutos !== 'TODOS' || filtroFuncionario
                                    ? 'Tente ajustar a pesquisa ou os filtros selecionados.'
                                    : isDono
                                    ? 'Cadastre clientes para gerenciar os produtos nas residências.'
                                    : 'Você ainda não possui clientes designados ao seu perfil.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}

