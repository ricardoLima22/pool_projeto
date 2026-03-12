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
    const [phAntes, setPhAntes] = useState('');
    const [phDepois, setPhDepois] = useState('');
    const [observacao, setObservacao] = useState('');
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

    const uploadFoto = async (fileObj, prefix, nomeCliente) => {
        if (!fileObj) return null;

        try {
            const fileExt = fileObj.name.split('.').pop();
            
            // Formata a data (DD_MM)
            const hoje = new Date();
            const dia = String(hoje.getDate()).padStart(2, '0');
            const mes = String(hoje.getMonth() + 1).padStart(2, '0');
            
            // Limpa o nome do cliente (maiúsculas, remove espaços e caracteres especiais)
            const nomeFormatado = nomeCliente.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
            
            const fileName = `${prefix}_${nomeFormatado}_${dia}_${mes}.${fileExt}`;
            const filePath = `visitas/${fileName}`;

            // Usa upsert para não dar erro se enviar outra foto pro mesmo cliente no mesmo dia
            const { error: uploadError } = await supabase.storage.from('pool-photos').upload(filePath, fileObj, { upsert: true });

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

        // Faz o upload de ambas as fotos independentemente com os novos prefixos
        const [urlFotoAntes, urlFotoDepois] = await Promise.all([
            uploadFoto(fotoAntes, 'antes', cliente.name),
            uploadFoto(fotoDepois, 'depois', cliente.name)
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
            ph_antes: phAntes ? parseFloat(phAntes) : null,
            ph_depois: phDepois ? parseFloat(phDepois) : null,
            products_used: quantidades,
            total_price: parseFloat(valorServico),
            photo_antes: urlFotoAntes,
            photo_depois: urlFotoDepois,
            observacao: observacao || null,
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

        // Limpa o número do WhatsApp (mantém apenas dígitos)
        let whatsappLimpo = cliente.whatsapp.replace(/\D/g, '');

        // Garante que o número tenha o DDI 55 (Brasil) se não tiver
        if (whatsappLimpo.length <= 11) {
            whatsappLimpo = `55${whatsappLimpo}`;
        }

        // Monta a mensagem do WhatsApp adaptada para o novo formato
        let msg = `Olá ${cliente.name}! ✅ A manutenção da sua piscina foi finalizada.\n\n` +
            `*Status da Água:*\n` +
            (phAntes ? `- pH Inicial (Antes): ${phAntes}\n` : '') +
            (phDepois ? `- pH Final (Depois): ${phDepois}\n` : '') +
            `\n*Serviço executado:*\n` +
            `Valor: R$ ${parseFloat(valorServico).toFixed(2)}\n\n`;

        if (observacao) {
            msg += `*Observações:*\n${observacao}\n\n`;
        }

        if (itensTexto.length > 0) {
            msg += `*Produtos utilizados na visita:*\n- ${itensTexto.join('\n- ')}\n\n`;
        }

        // Encurtar os links antes de enviar no WhatsApp para ficar mais elegante
        const encurtar = async (url) => {
            if (!url) return null;
            try {
                const res = await fetch('/api/shorten', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url })
                });
                const data = await res.json();
                return data.shortUrl || url;
            } catch (err) {
                return url;
            }
        };

        const shortAntes = await encurtar(urlFotoAntes);
        const shortDepois = await encurtar(urlFotoDepois);

        if (shortAntes || shortDepois) {
            msg += `📸 *Fotos do Serviço:*\n`;
            if (shortAntes) msg += `Antes: ${shortAntes}\n`;
            if (shortDepois) msg += `Depois: ${shortDepois}\n`;
        } else if (fotoAntes || fotoDepois) {
            alert("⚠️ As fotos não puderam ser enviadas. Verifique se a pasta 'pool-photos' no Supabase é PÚBLICA.");
        }

        const whatsappUrl = `https://wa.me/${whatsappLimpo}?text=${encodeURIComponent(msg)}`;

        // Tenta abrir o WhatsApp. Se o navegador bloquear o popup por causa do tempo de upload das fotos,
        // usamos o location.href como backup para garantir que a mensagem saia.
        const win = window.open(whatsappUrl, '_blank');
        if (!win || win.closed || typeof win.closed === 'undefined') {
            window.location.href = whatsappUrl;
        } else {
            router.push('/home');
        }
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-slate-500 font-bold uppercase tracking-widest text-sm text-center">Iniciando visita...</p>
                </div>
            </main>
        );
    }

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
            <div className="mb-6">
                <h2 className="text-slate-800 font-bold text-base mb-3">Produtos Utilizados <span className="text-slate-400 text-xs font-normal">(Estoque)</span></h2>
                <div className="space-y-2">
                    {produtos.map(p => (
                        <div key={p.id} className="bg-white p-3 rounded-2xl flex justify-between items-center shadow-sm border border-slate-100">
                            <div className="flex-1">
                                <p className="text-sm font-bold text-slate-700 leading-tight">{p.name}</p>
                                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                    Disponível: {p.stock_quantity} {p.unit}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => alterarQtd(p.id, -1, p.stock_quantity)} className="w-8 h-8 bg-slate-50 rounded-full font-bold text-lg text-slate-400 border border-slate-100 active:bg-slate-200 transition">-</button>
                                <span className="font-black text-sm min-w-[20px] text-center text-slate-800">{quantidades[p.id] || 0}</span>
                                <button
                                    onClick={() => alterarQtd(p.id, 1, p.stock_quantity)}
                                    disabled={(quantidades[p.id] || 0) >= p.stock_quantity}
                                    className="w-8 h-8 bg-slate-50 rounded-full font-bold text-lg text-slate-400 border border-slate-100 active:bg-slate-200 transition disabled:opacity-30"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    ))}
                    {produtos.length === 0 && (
                        <p className="text-slate-400 text-xs text-center py-3 bg-white rounded-2xl border border-slate-100">Sem produtos.</p>
                    )}
                </div>
            </div>

            {/* Registro Fotográfico e pH */}
            <h2 className="text-slate-800 font-bold text-base mb-3">Registro e Medições</h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Coluna Antes */}
                <div className="space-y-2">
                    <label className={`flex flex-col items-center justify-center h-28 border-2 border-dashed ${fotoAntes ? 'border-orange-400 bg-orange-50' : 'border-slate-300 bg-white'} rounded-2xl active:scale-95 transition-all cursor-pointer`}>
                        <span className="text-2xl mb-1">{fotoAntes ? "✅" : "📷"}</span>
                        <p className={`text-[10px] font-bold text-center px-1 ${fotoAntes ? 'text-orange-600' : 'text-slate-400'}`}>{fotoAntes ? "Antes capturado" : "Foto Antes (Câmera ou Galeria)"}</p>
                        <input type="file" accept="image/*" className="hidden" onChange={(e) => setFotoAntes(e.target.files[0])} />
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            step="0.1"
                            placeholder="pH Antes"
                            value={phAntes}
                            onChange={(e) => setPhAntes(e.target.value)}
                            className="w-full px-3 py-3 rounded-xl bg-white border border-slate-300 text-base font-black text-black placeholder:text-slate-400 focus:ring-2 ring-blue-500 text-center shadow-sm"
                        />
                    </div>
                </div>

                {/* Coluna Depois */}
                <div className="space-y-2">
                    <label 
                        onClick={() => { if(!fotoAntes) alert("⚠️ Por favor, registre a 'Foto Antes' primeiro."); }}
                        className={`flex flex-col items-center justify-center h-28 border-2 border-dashed ${fotoDepois ? 'border-emerald-400 bg-emerald-50' : !fotoAntes ? 'border-slate-100 bg-slate-50 opacity-40 grayscale cursor-not-allowed' : 'border-slate-300 bg-white'} rounded-2xl active:scale-95 transition-all cursor-pointer relative`}
                    >
                        {!fotoAntes && <span className="absolute top-2 right-2 text-[10px]">🔒</span>}
                        <span className="text-2xl mb-1">{fotoDepois ? "✅" : "✨"}</span>
                        <p className={`text-[10px] font-bold text-center px-1 ${fotoDepois ? 'text-emerald-600' : 'text-slate-400'}`}>{fotoDepois ? "Depois capturado" : "Foto Depois"}</p>
                        <input 
                            type="file" 
                            accept="image/*" 
                            disabled={!fotoAntes}
                            className="hidden" 
                            onChange={(e) => setFotoDepois(e.target.files[0])} 
                        />
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            step="0.1"
                            placeholder="pH Depois"
                            value={phDepois}
                            onChange={(e) => setPhDepois(e.target.value)}
                            className={`w-full px-3 py-3 rounded-xl bg-white border border-slate-300 text-base font-black text-black placeholder:text-slate-400 focus:ring-2 ring-blue-500 text-center shadow-sm ${!fotoAntes ? 'opacity-40 grayscale' : ''}`}
                            disabled={!fotoAntes}
                        />
                    </div>
                </div>
            </div>

            {/* Observações */}
            <div className="mb-8">
                <textarea
                    placeholder="Adicionar observação sobre a visita... (Opcional)"
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-white border border-slate-300 text-sm font-medium text-slate-800 placeholder:text-slate-400 focus:ring-2 ring-blue-500 shadow-sm resize-none h-24"
                ></textarea>
            </div>

            {/* Rodapé Fixo Compacto */}
            <footer className="fixed bottom-0 left-0 right-0 bg-white p-4 pb-8 rounded-t-[32px] shadow-[0_-15px_35px_-10px_rgba(0,0,0,0.08)] z-10 border-t border-slate-100">
                <div className="mb-4">
                    <label className="block text-slate-400 font-bold mb-1.5 uppercase text-[9px] tracking-wider ml-1">Valor Cobrado</label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-sm">R$</span>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={valorServico}
                            onChange={(e) => setValorServico(e.target.value)}
                            className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white border border-slate-200 text-2xl font-black text-black placeholder:text-slate-300 focus:ring-2 ring-blue-500 shadow-sm"
                        />
                    </div>
                </div>

                <button
                    onClick={finalizarVisita}
                    disabled={enviando || !valorServico}
                    className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-base shadow-lg shadow-blue-100 active:scale-[0.97] transition-all disabled:opacity-40 disabled:active:scale-100 flex justify-center items-center gap-2"
                >
                    {enviando ? "SALVANDO..." : (
                        <>
                            <span>FINALIZAR E ENVIAR</span>
                            <span className="text-xl">💬</span>
                        </>
                    )}
                </button>
            </footer>
        </main>
    );
}
