// src/app/visita/nova/page.js
'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '../../../lib/supabase';
import { useSearchParams, useRouter } from 'next/navigation';

export default function NovaVisitaPage() {
    return (
        <Suspense fallback={<p className="p-10 text-center animate-pulse">Carregando formulário...</p>}>
            <NovaVisita />
        </Suspense>
    );
}

function NovaVisita() {
    const searchParams = useSearchParams();
    //const router = useRouter();
    const clienteId = searchParams.get('clienteId');
    const [cliente, setCliente] = useState(null);
    const [clientesList, setClientesList] = useState([]);
    const [produtos, setProdutos] = useState([]);
    const [quantidades, setQuantidades] = useState({});
    const [loading, setLoading] = useState(true);

    // Novos campos do planejamento
    const [fotoAntes, setFotoAntes] = useState(null);
    const [fotoDepois, setFotoDepois] = useState(null);
    const [valorServico, setValorServico] = useState('');
    const [enviando, setEnviando] = useState(false);

    const router = useRouter();

    useEffect(() => {
        async function carregarDados() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single();

                const resProdutos = await supabase.from('products').select('*').eq('company_id', profile.company_id);
                setProdutos(resProdutos.data || []);

                if (clienteId) {
                    const resCliente = await supabase.from('customers').select('*').eq('id', clienteId).single();
                    setCliente(resCliente.data);
                } else {
                    const resClientes = await supabase.from('customers').select('*').eq('company_id', profile.company_id).order('name');
                    setClientesList(resClientes.data || []);
                }
            }
            setLoading(false);
        }
        carregarDados();
    }, [clienteId]);

    const alterarQtd = (id, delta, maxStock) => {
        setQuantidades(prev => {
            const current = prev[id] || 0;
            const next = current + delta;
            // Não pode ser menor que 0, nem maior que o estoque
            return { ...prev, [id]: Math.min(Math.max(0, next), maxStock) };
        });
    };

    const uploadFoto = async (fileObj) => {
        if (!fileObj) return null;

        try {
            const fileExt = fileObj.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `visitas/${fileName}`;

            const { error: uploadError } = await supabase.storage.from('pool-photos').upload(filePath, fileObj);

            if (uploadError) {
                console.error("Erro Supabase Upload:", uploadError);
                alert(`Erro ao fazer upload da foto: ${uploadError.message}`);
                return null;
            }

            const { data } = supabase.storage.from('pool-photos').getPublicUrl(filePath);
            return data?.publicUrl || null;
        } catch (err) {
            console.error("Exceção no upload:", err);
            return null;
        }
    };

    const finalizarVisita = async () => {
        if (!valorServico) {
            alert("Por favor, informe o valor cobrado pelo serviço.");
            return;
        }

        setEnviando(true);

        // Faz o upload de ambas as fotos independentemente
        const [urlFotoAntes, urlFotoDepois] = await Promise.all([
            uploadFoto(fotoAntes),
            uploadFoto(fotoDepois)
        ]);

        const itensTexto = produtos
            .filter(p => quantidades[p.id] > 0)
            .map(p => `${quantidades[p.id]}${p.unit} de ${p.name}`);

        // Pegamos o ID do usuário para o schema
        const { data: { user } } = await supabase.auth.getUser();

        // Salva no banco de dados com a arquitetura definida
        const { error: visitError } = await supabase.from('visits').insert([{
            customer_id: cliente.id,
            piscineiro_id: user?.id,
            products_used: quantidades,
            total_price: parseFloat(valorServico),
            photo_url: urlFotoDepois || urlFotoAntes,
            sent_to_whatsapp: true
        }]);

        if (!visitError) {
            // Dar baixa no estoque
            for (const pId of Object.keys(quantidades)) {
                const qtdUsada = quantidades[pId];
                if (qtdUsada > 0) {
                    const originalProduto = produtos.find(p => p.id === pId);
                    if (originalProduto) {
                        await supabase
                            .from('products')
                            .update({ stock_quantity: originalProduto.stock_quantity - qtdUsada })
                            .eq('id', pId);
                    }
                }
            }
        }

        // Monta a mensagem do WhatsApp adaptada para o novo formato
        let msg = `Olá ${cliente.name}! ✅ A manutenção da sua piscina foi finalizada.\n\n` +
            `*Serviço executado:*\n` +
            `Valor: R$ ${parseFloat(valorServico).toFixed(2)}\n\n`;

        if (itensTexto.length > 0) {
            msg += `*Produtos utilizados na visita:*\n- ${itensTexto.join('\n- ')}\n\n`;
        }

        if (urlFotoAntes || urlFotoDepois) {
            msg += `📸 *Fotos do Serviço:*\n`;
            if (urlFotoAntes) msg += `Antes: ${urlFotoAntes}\n`;
            if (urlFotoDepois) msg += `Depois: ${urlFotoDepois}\n`;
        } else if (fotoAntes || fotoDepois) {
            // Se o usuário selecionou foto mas as URLs voltaram vázias, houve erro no Storage
            alert("⚠️ As fotos não puderam ser enviadas. Verifique se a pasta 'pool-photos' no Supabase é PÚBLICA e permite Inserts.");
        }

        window.open(`https://wa.me/55${cliente.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
        router.push('/home');
    };

    if (loading) return <p className="p-10 text-center animate-pulse">Carregando visita...</p>;

    // Tela de Seleção de Cliente
    if (!cliente) {
        return (
            <main className="min-h-screen bg-slate-50 p-6 pb-40">
                <div className="flex items-center gap-4 mb-6">
                    <button onClick={() => router.back()} className="text-slate-500 text-2xl">←</button>
                    <h1 className="text-2xl font-black text-slate-800">Nova Visita</h1>
                </div>
                <p className="text-slate-500 font-bold mb-4 uppercase text-xs">Selecione o Cliente</p>
                <div className="space-y-3">
                    {clientesList.map(c => (
                        <button
                            key={c.id}
                            onClick={() => setCliente(c)}
                            className="w-full text-left bg-white p-5 rounded-3xl border border-slate-100 shadow-sm active:scale-95 transition-all flex flex-col"
                        >
                            <span className="font-bold text-lg text-slate-800">{c.name}</span>
                            <span className="text-sm text-slate-400 mt-1">{c.address || 'Sem endereço'}</span>
                        </button>
                    ))}
                    {clientesList.length === 0 && (
                        <div className="text-center p-8 bg-white rounded-3xl border border-slate-100">
                            <p className="text-slate-500 font-bold mb-2">Nenhum cliente encontrado.</p>
                            <button onClick={() => router.push('/clientes/novo')} className="text-blue-600 font-bold text-sm">
                                + Cadastrar Cliente
                            </button>
                        </div>
                    )}
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 p-4 pb-[220px]">
            <header className="mb-6 flex gap-3">
                <button onClick={() => {
                    if (!clienteId) setCliente(null);
                    else router.back();
                }} className="text-slate-500 text-2xl mt-[-4px]">←</button>
                <div>
                    <h1 className="text-xl font-black text-slate-800">{cliente?.name}</h1>
                    <p className="text-slate-500 text-sm">{cliente?.pool_volume_m3}m³ • {cliente?.address}</p>
                </div>
            </header>

            {/* Registro de Uso de Produtos (Opcional para a Cobrança) */}
            <div className="mb-8">
                <h2 className="text-slate-800 font-black text-lg mb-3">Produtos Utilizados <span className="text-slate-400 text-sm font-normal">(Estoque)</span></h2>
                <div className="space-y-3">
                    {produtos.map(p => (
                        <div key={p.id} className="bg-white p-4 rounded-3xl flex justify-between items-center shadow-sm border border-slate-100">
                            <div className="flex-1">
                                <p className="font-bold text-slate-700">{p.name}</p>
                                <p className="text-xs text-slate-400 font-medium">
                                    Estoque: {p.stock_quantity} {p.unit}
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button onClick={() => alterarQtd(p.id, -1, p.stock_quantity)} className="w-10 h-10 bg-slate-100 rounded-full font-bold text-xl text-slate-500 hover:bg-slate-200 transition">-</button>
                                <span className="font-black text-lg min-w-[30px] text-center text-slate-800">{quantidades[p.id] || 0}</span>
                                <button
                                    onClick={() => alterarQtd(p.id, 1, p.stock_quantity)}
                                    disabled={(quantidades[p.id] || 0) >= p.stock_quantity}
                                    className="w-10 h-10 bg-slate-100 rounded-full font-bold text-xl text-slate-500 hover:bg-slate-200 transition disabled:opacity-30 disabled:hover:bg-slate-100"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    ))}
                    {produtos.length === 0 && (
                        <p className="text-slate-400 text-sm text-center py-4 bg-white rounded-3xl border border-slate-100">Nenhum produto em estoque.</p>
                    )}
                </div>
            </div>

            {/* Captura de Múltiplas Fotos */}
            <h2 className="text-slate-800 font-black text-lg mb-3">Registro Fotográfico</h2>
            <div className="grid grid-cols-2 gap-3 mb-8">
                <label className={`flex flex-col items-center justify-center h-32 border-2 border-dashed ${fotoAntes ? 'border-orange-400 bg-orange-50' : 'border-slate-300 bg-white'} rounded-3xl active:scale-95 transition-all cursor-pointer`}>
                    <span className="text-3xl mb-1">{fotoAntes ? "✅" : "📷"}</span>
                    <p className={`text-xs font-bold text-center px-2 ${fotoAntes ? 'text-orange-600' : 'text-slate-500'}`}>{fotoAntes ? "Antes capturado" : "Foto Antes"}</p>
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setFotoAntes(e.target.files[0])} />
                </label>

                <label className={`flex flex-col items-center justify-center h-32 border-2 border-dashed ${fotoDepois ? 'border-emerald-400 bg-emerald-50' : 'border-slate-300 bg-white'} rounded-3xl active:scale-95 transition-all cursor-pointer`}>
                    <span className="text-3xl mb-1">{fotoDepois ? "✅" : "✨"}</span>
                    <p className={`text-xs font-bold text-center px-2 ${fotoDepois ? 'text-emerald-600' : 'text-slate-500'}`}>{fotoDepois ? "Depois capturado" : "Foto Depois"}</p>
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => setFotoDepois(e.target.files[0])} />
                </label>
            </div>

            {/* Rodapé Fixo com Cobrança Manual e Botão */}
            <footer className="fixed bottom-0 left-0 right-0 bg-white p-6 rounded-t-[40px] shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.1)] z-10">
                <div className="mb-5">
                    <label className="block text-slate-500 font-bold mb-2 uppercase text-xs">Valor Cobrado pelo Serviço</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">R$</span>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={valorServico}
                            onChange={(e) => setValorServico(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-50 border-none text-2xl font-black text-slate-800 placeholder:text-slate-300 focus:ring-2 ring-blue-500"
                        />
                    </div>
                </div>

                <button
                    onClick={finalizarVisita}
                    disabled={enviando || !valorServico}
                    className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-blue-200 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex justify-center items-center gap-3"
                >
                    {enviando ? "PROCESSANDO VISITA..." : (
                        <>
                            <span>FINALIZAR SERVIÇO</span>
                            <span className="text-2xl leading-none">💬</span>
                        </>
                    )}
                </button>
            </footer>
        </main>
    );
}
