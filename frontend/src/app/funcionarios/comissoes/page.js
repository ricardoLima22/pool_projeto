// src/app/funcionarios/comissoes/page.js
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, TrendingUp, Droplets, Wallet, ChevronDown, AlertCircle } from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (value) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const RATE_NORMAL = 0.40;
const RATE_GRANDE = 0.50;

// ─── Sub-components ──────────────────────────────────────────────────────────
function SkeletonCard() {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 animate-pulse">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-slate-200 rounded-full" />
                <div className="flex-1">
                    <div className="h-4 bg-slate-200 rounded w-32 mb-2" />
                    <div className="h-3 bg-slate-100 rounded w-20" />
                </div>
            </div>
            <div className="space-y-2">
                <div className="h-12 bg-slate-100 rounded-xl" />
                <div className="h-12 bg-slate-100 rounded-xl" />
                <div className="h-14 bg-slate-200 rounded-xl" />
            </div>
        </div>
    );
}

function PoolTypeBadge({ type, clientes, totalValor, comissao }) {
    const isGrande = type === 'Grande';
    return (
        <div className={`rounded-xl p-3 ${isGrande ? 'bg-blue-50 border border-blue-100' : 'bg-cyan-50 border border-cyan-100'}`}>
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                    <span className="text-base">{isGrande ? '🌊' : '💧'}</span>
                    <span className={`text-xs font-bold uppercase tracking-wider ${isGrande ? 'text-blue-700' : 'text-cyan-700'}`}>
                        {type} <span className="font-normal opacity-70">({isGrande ? '50%' : '40%'})</span>
                    </span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${isGrande ? 'bg-blue-100 text-blue-700' : 'bg-cyan-100 text-cyan-700'}`}>
                    {clientes} cliente{clientes !== 1 ? 's' : ''}
                </span>
            </div>
            <div className="flex items-end justify-between mt-2">
                <div>
                    <p className="text-[11px] text-slate-500">Faturamento fixo</p>
                    <p className={`font-bold text-sm ${isGrande ? 'text-blue-800' : 'text-cyan-800'}`}>{fmt(totalValor)}</p>
                </div>
                <div className="text-right">
                    <p className="text-[11px] text-slate-500">Comissão</p>
                    <p className={`font-bold text-base ${isGrande ? 'text-blue-600' : 'text-cyan-600'}`}>{fmt(comissao)}</p>
                </div>
            </div>
        </div>
    );
}

function FuncionarioCard({ funcionario }) {
    const [expanded, setExpanded] = useState(false);
    const { name, normal, grande } = funcionario;

    const totalNormal = normal?.total || 0;
    const totalGrande = grande?.total || 0;
    const qtdNormal = normal?.count || 0;
    const qtdGrande = grande?.count || 0;

    const comissaoNormal = totalNormal * RATE_NORMAL;
    const comissaoGrande = totalGrande * RATE_GRANDE;
    const comissaoTotal = comissaoNormal + comissaoGrande;
    const faturamentoTotal = totalNormal + totalGrande;
    const totalClientes = qtdNormal + qtdGrande;

    const initials = name
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase();

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Card Header */}
            <button
                onClick={() => setExpanded((v) => !v)}
                className="w-full p-5 text-left hover:bg-slate-50 transition-colors"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                            {initials}
                        </div>
                        <div>
                            <p className="font-bold text-slate-800 text-sm">{name}</p>
                            <p className="text-xs text-slate-500">{totalClientes} cliente{totalClientes !== 1 ? 's' : ''} atribuído{totalClientes !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-[11px] text-slate-500 mb-0.5">Total a receber</p>
                        <p className="font-bold text-emerald-600 text-base">{fmt(comissaoTotal)}</p>
                    </div>
                </div>

                {/* Progress bar visual */}
                {faturamentoTotal > 0 && (
                    <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min((comissaoTotal / faturamentoTotal) * 100 * 2, 100)}%` }}
                        />
                    </div>
                )}

                <div className="flex items-center justify-end mt-2 gap-1">
                    <span className="text-xs text-slate-400">
                        {expanded ? 'Ocultar detalhes' : 'Ver detalhes'}
                    </span>
                    <ChevronDown
                        className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                    />
                </div>
            </button>

            {/* Expanded Details */}
            {expanded && (
                <div className="px-5 pb-5 space-y-2 border-t border-slate-50 pt-4">
                    {qtdNormal > 0 && (
                        <PoolTypeBadge
                            type="Normal"
                            clientes={qtdNormal}
                            totalValor={totalNormal}
                            comissao={comissaoNormal}
                        />
                    )}
                    {qtdGrande > 0 && (
                        <PoolTypeBadge
                            type="Grande"
                            clientes={qtdGrande}
                            totalValor={totalGrande}
                            comissao={comissaoGrande}
                        />
                    )}

                    {/* Total Row */}
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-4 mt-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-emerald-100 text-xs font-medium">Faturamento do mês</p>
                                <p className="text-white font-bold">{fmt(faturamentoTotal)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-emerald-100 text-xs font-medium">💰 Comissão a pagar</p>
                                <p className="text-white font-bold text-lg">{fmt(comissaoTotal)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ComissoesFuncionarios() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [funcionarios, setFuncionarios] = useState([]);
    const [nullCount, setNullCount] = useState(0);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            setError(null);

            // 1. Autentica e pega o company_id
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) { router.push('/login'); return; }

            const { data: profile } = await supabase
                .from('profiles')
                .select('company_id')
                .eq('id', user.id)
                .single();

            if (!profile?.company_id) {
                setError('Não foi possível identificar a empresa.');
                setLoading(false);
                return;
            }

            // 2. Busca todos os clientes da empresa COM pool_size e funcionario_id definidos
            const { data: clientes, error: clientErr } = await supabase
                .from('customers')
                .select('funcionario_id, pool_size, price, profiles!customers_funcionario_id_fkey(full_name)')
                .eq('company_id', profile.company_id)
                .not('pool_size', 'is', null)
                .not('funcionario_id', 'is', null);

            // 3. Conta clientes sem pool_size (para aviso)
            const { count: nullCountRes } = await supabase
                .from('customers')
                .select('*', { count: 'exact', head: true })
                .eq('company_id', profile.company_id)
                .is('pool_size', null);

            if (clientErr) {
                setError('Erro ao buscar dados dos clientes.');
                setLoading(false);
                return;
            }

            setNullCount(nullCountRes || 0);

            // 4. Agrupa por funcionario_id e tipo de piscina
            const mapa = {};
            (clientes || []).forEach((c) => {
                const id = c.funcionario_id;
                const nome = c.profiles?.full_name || 'Desconhecido';
                if (!mapa[id]) mapa[id] = { name: nome, normal: { total: 0, count: 0 }, grande: { total: 0, count: 0 } };

                if (c.pool_size === 'Normal') {
                    mapa[id].normal.total += c.price || 0;
                    mapa[id].normal.count += 1;
                } else if (c.pool_size === 'Grande') {
                    mapa[id].grande.total += c.price || 0;
                    mapa[id].grande.count += 1;
                }
            });

            setFuncionarios(Object.values(mapa).sort((a, b) => a.name.localeCompare(b.name)));
            setLoading(false);
        }

        fetchData();
    }, [router]);

    // Totais gerais
    const totalComissoes = funcionarios.reduce((acc, f) => {
        return acc
            + (f.normal?.total || 0) * RATE_NORMAL
            + (f.grande?.total || 0) * RATE_GRANDE;
    }, 0);

    const totalFaturamento = funcionarios.reduce((acc, f) => {
        return acc + (f.normal?.total || 0) + (f.grande?.total || 0);
    }, 0);

    return (
        <div className="min-h-screen bg-slate-50 font-sans">
            {/* Header */}
            <header className="bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 px-5 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-12 text-white shadow-xl">
                <div className="max-w-2xl mx-auto">
                    <button
                        id="btn-voltar-comissoes"
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors mb-5"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Voltar
                    </button>

                    <div className="flex items-start justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Wallet className="h-5 w-5 text-cyan-300" />
                                <span className="text-xs font-bold uppercase tracking-widest text-cyan-300">Comissões</span>
                            </div>
                            <h1 className="text-2xl font-bold text-white">Fechamento Mensal</h1>
                            <p className="text-white/60 text-sm mt-1">Comissões por tipo de piscina</p>
                        </div>
                        <div className="text-right">
                            <p className="text-white/60 text-xs">Total a pagar</p>
                            <p className="text-2xl font-bold text-emerald-300">{fmt(totalComissoes)}</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="max-w-2xl mx-auto px-5 -mt-6 pb-24 relative z-10">

                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
                        <div className="flex justify-center mb-1">
                            <TrendingUp className="h-5 w-5 text-slate-400" />
                        </div>
                        <p className="text-lg font-bold text-slate-800">{fmt(totalFaturamento)}</p>
                        <p className="text-xs text-slate-500">Faturamento total</p>
                    </div>
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 text-center">
                        <div className="flex justify-center mb-1">
                            <Users className="h-5 w-5 text-slate-400" />
                        </div>
                        <p className="text-lg font-bold text-slate-800">{funcionarios.length}</p>
                        <p className="text-xs text-slate-500">Funcionários</p>
                    </div>
                </div>

                {/* Regra de comissão */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-6 flex gap-4">
                    <div className="flex-1 text-center">
                        <span className="text-xl">💧</span>
                        <p className="text-xs text-slate-500 mt-1">Piscina Normal</p>
                        <p className="font-bold text-cyan-600 text-sm">40% de comissão</p>
                    </div>
                    <div className="w-px bg-slate-100" />
                    <div className="flex-1 text-center">
                        <span className="text-xl">🌊</span>
                        <p className="text-xs text-slate-500 mt-1">Piscina Grande</p>
                        <p className="font-bold text-blue-600 text-sm">50% de comissão</p>
                    </div>
                </div>

                {/* Aviso clientes sem pool_size */}
                {nullCount > 0 && (
                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                        <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700">
                            <span className="font-bold">{nullCount} cliente{nullCount !== 1 ? 's' : ''}</span> sem tamanho de piscina cadastrado — não entram no cálculo. Edite os cadastros para incluí-los.
                        </p>
                    </div>
                )}

                {/* Lista de funcionários */}
                <section>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                        Detalhamento por Funcionário
                    </h2>

                    {loading ? (
                        <div className="space-y-4">
                            <SkeletonCard />
                            <SkeletonCard />
                        </div>
                    ) : error ? (
                        <div className="bg-white rounded-2xl p-8 text-center border border-red-100">
                            <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
                            <p className="text-slate-600 font-medium text-sm">{error}</p>
                        </div>
                    ) : funcionarios.length === 0 ? (
                        <div className="bg-white rounded-2xl p-8 text-center border border-slate-100">
                            <Droplets className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-slate-600 font-medium">Nenhum dado encontrado</p>
                            <p className="text-slate-400 text-sm mt-1">Cadastre clientes com tamanho de piscina para visualizar as comissões.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {funcionarios.map((func) => (
                                <FuncionarioCard key={func.name} funcionario={func} />
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}
