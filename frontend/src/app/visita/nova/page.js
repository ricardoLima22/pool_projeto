// src/app/visita/nova/page.js
'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '../../../lib/supabase';
import { useSearchParams, useRouter } from 'next/navigation';
import SplashScreen from '../../../components/SplashScreen';

export default function NovaVisitaPage() {
    return (
        <Suspense fallback={<SplashScreen message="Carregando formulário..." />}>
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
    const [companySession, setCompanySession] = useState('');

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

                // Busca a sessão configurada para essa empresa logada:
                const { data: companyInfo } = await supabase.from('companies').select('whatsapp_session').eq('id', profile.company_id).single();
                if (companyInfo && companyInfo.whatsapp_session) {
                    setCompanySession(companyInfo.whatsapp_session);
                } else {
                    // Fallback
                    console.error("Nenhuma sessão configurada para esta empresa!");
                }

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

    const comprimirImagem = (file) => {
        return new Promise((resolve) => {
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);
            
            img.onload = () => {
                URL.revokeObjectURL(objectUrl); // Limpa a memória instantaneamente
                
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1200;
                const MAX_HEIGHT = 1200;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                // Converte para JPEG com 80% de qualidade e retorna o BLOB bruto (muito mais seguro p/ Safari)
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else resolve(file); // Em caso extremo de erro no canvas, devolve original
                }, 'image/jpeg', 0.8);
            };
            
            img.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                resolve(file); // Arquivos não suportados pelo Image (ex: RAW) vão inteiros
            };
            
            img.src = objectUrl;
        });
    };

    const uploadFoto = async (fileObj, prefix, nomeCliente) => {
        if (!fileObj) return null;

        try {
            // Tenta comprimir
            let arquivoUpload = fileObj;
            let extensao = fileObj.name?.split('.').pop() || 'jpg';
            let tipoConteudo = fileObj.type || 'image/jpeg';
            
            try {
                const comprimido = await comprimirImagem(fileObj);
                if (comprimido !== fileObj) {
                    arquivoUpload = comprimido;
                    extensao = 'jpg';
                    tipoConteudo = 'image/jpeg';
                }
            } catch (fallbackErr) {
                console.error("Falha ao comprimir imagem, usando original:", fallbackErr);
            }
            
            // Formata a data (DD_MM)
            const hoje = new Date();
            const dia = String(hoje.getDate()).padStart(2, '0');
            const mes = String(hoje.getMonth() + 1).padStart(2, '0');
            
            // Limpa o nome do cliente (maiúsculas, remove espaços e caracteres especiais)
            const nomeFormatado = nomeCliente.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
            
            const hora = String(hoje.getHours()).padStart(2, '0');
            const min = String(hoje.getMinutes()).padStart(2, '0');
            const seg = String(hoje.getSeconds()).padStart(2, '0');
            const fileName = `${prefix}_${nomeFormatado}_${dia}_${mes}_${hora}${min}${seg}.${extensao}`;
            const filePath = `visitas/${fileName}`;

            // Usa upsert para não dar erro se enviar outra foto pro mesmo cliente no mesmo dia
            const { error: uploadError } = await supabase.storage.from('pool-photos').upload(filePath, arquivoUpload, { 
                upsert: true,
                contentType: tipoConteudo 
            });

            if (uploadError) {
                console.error("Erro Supabase Upload:", uploadError);
                alert(`Erro ao subir arquivo ${prefix}: ${uploadError.message}`);
                return null;
            }

            const { data } = supabase.storage.from('pool-photos').getPublicUrl(filePath);
            return {
                publicUrl: data?.publicUrl || null,
                fileName: fileName // Retorna apenas o nome do arquivo "inteligente" no banco
            };
        } catch (err) {
            console.error("Exceção fatal no upload:", err);
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
        const [resultadoAntes, resultadoDepois] = await Promise.all([
            uploadFoto(fotoAntes, 'antes', cliente.name),
            uploadFoto(fotoDepois, 'depois', cliente.name)
        ]);

        const urlFotoAntes = resultadoAntes?.publicUrl;
        const nomeArquivoAntes = resultadoAntes?.fileName;
        
        const urlFotoDepois = resultadoDepois?.publicUrl;
        const nomeArquivoDepois = resultadoDepois?.fileName;

        const itensTexto = produtos
            .filter(p => quantidades[p.id] > 0)
            .map(p => `${quantidades[p.id]}${p.unit} de ${p.name}`);

        // Pegamos o ID do usuário para o schema
        const { data: { user } } = await supabase.auth.getUser();

        // Salva no banco de dados com a arquitetura definida
        // Gravado no Banco: Já que as fotos têm nomes limpos, os links no banco (photo_antes e photo_depois)
        // continuarão padronizados de forma mais inteligente. Ou seja, guardamos apenas o nome (ex: antes_RICARDO_10_03.png) 
        const { error: visitError } = await supabase.from('visits').insert([{
            customer_id: cliente.id,
            piscineiro_id: user?.id,
            ph_antes: phAntes ? parseFloat(phAntes) : null,
            ph_depois: phDepois ? parseFloat(phDepois) : null,
            products_used: quantidades,
            total_price: parseFloat(valorServico),
            photo_antes: nomeArquivoAntes || null,
            photo_depois: nomeArquivoDepois || null,
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

        // Chamada direta para a API Interna que aciona o GitHub Actions
        try {
            const botResponse = await fetch('/api/trigger-bot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cliente_nome: cliente.name,
                    numero_whatsapp: whatsappLimpo,
                    mensagem_texto: msg,
                    foto_antes_url: urlFotoAntes,
                    foto_depois_url: urlFotoDepois,
                    session_id: companySession
                })
            });

            if (botResponse.ok) {
                alert("✅ Visita salva! O robô enviará a mensagem pelo WhatsApp da empresa em instantes.");
                router.push('/home');
            } else {
                const erroData = await botResponse.json();
                console.error("Falha ao acionar bot:", erroData);
                alert("⚠️ A visita foi salva no sistema, mas houve um erro ao acionar o robô de WhatsApp. Código: " + botResponse.status);
                router.push('/home');
            }
        } catch (error) {
            console.error("Erro fatal ao acionar bot:", error);
            alert("⚠️ Visita salva, mas o robô de envio automático está inacessível no momento.");
            router.push('/home');
        }
    };

    if (loading) {
        return <SplashScreen message="Iniciando visita..." />;
    }

    // Tela de Seleção de Cliente
    if (!cliente) {
        return (
            <main className="min-h-screen bg-[#fcfbf8] pb-40">
                <header className="px-4 pt-6 pb-4 bg-white border-b border-slate-200 sticky top-0 z-10 flex items-center gap-3">
                    <button onClick={() => router.back()} className="text-slate-800 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                    </button>
                    <h1 className="text-lg font-bold text-slate-800 tracking-tight">Nova Visita</h1>
                </header>

                <div className="px-4 pt-6">
                    <p className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-4">Selecione o Cliente</p>
                    <div className="space-y-3">
                        {clientesList.map(c => (
                            <button
                                key={c.id}
                                onClick={() => setCliente(c)}
                                className="w-full bg-white rounded-xl border border-slate-100 p-4 flex items-center justify-between hover:border-[#008080]/30 transition-colors text-left shadow-sm active:scale-[0.99]"
                            >
                                <div className="space-y-1 overflow-hidden pr-2">
                                    <p className="font-bold text-slate-800 text-sm truncate">{c.name}</p>
                                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1 truncate">
                                        <svg className="h-3 w-3 text-red-500 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                                        <span className="truncate">{c.address || 'Endereço não informado'}</span>
                                    </p>
                                    <span className="inline-block mt-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase">
                                        {c.pool_volume_m3 || 0} M³
                                    </span>
                                </div>
                                <svg className="h-5 w-5 text-[#008080] shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                            </button>
                        ))}
                        {clientesList.length === 0 && (
                            <div className="text-center p-8 bg-white rounded-xl border border-slate-100">
                                <p className="text-sm font-medium text-slate-500 mb-2">Nenhum cliente encontrado.</p>
                                <button onClick={() => router.push('/clientes/novo')} className="text-[#008080] font-bold text-sm hover:underline">
                                    + Cadastrar Cliente
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#fcfbf8] pb-48">
            <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-4 pt-6 flex items-center gap-3 mb-6">
                <button onClick={() => {
                    if (!clienteId) setCliente(null);
                    else router.back();
                }} className="text-slate-800 transition-colors p-1 -ml-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
                </button>
                <div>
                    <h1 className="text-lg font-bold text-slate-800 leading-tight truncate max-w-[250px]">{cliente?.name}</h1>
                    <p className="text-sm text-slate-500 truncate max-w-[250px]">
                        {cliente?.pool_volume_m3 || 0}m³ • {cliente?.address || 'Sem endereço'}
                    </p>
                </div>
            </header>

            <div className="px-4 space-y-6 max-w-2xl mx-auto">
                {/* Registro de Uso de Produtos (Opcional para a Cobrança) */}
                <section>
                    <div className="flex items-baseline gap-2 mb-2">
                        <h2 className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block">Produtos Utilizados</h2>
                        <span className="text-[10px] text-slate-400 tracking-normal">(Estoque)</span>
                    </div>
                    {produtos.length === 0 ? (
                        <div className="rounded-xl border border-slate-200 bg-white py-4 text-center">
                            <p className="text-sm text-slate-500">Sem produtos.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {produtos.map(p => (
                                <div key={p.id} className="bg-white p-3 rounded-xl flex justify-between items-center shadow-sm border border-slate-200">
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-slate-700 leading-tight">{p.name}</p>
                                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                                            Disponível: {p.stock_quantity} {p.unit}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => alterarQtd(p.id, -1, p.stock_quantity)} className="w-8 h-8 flex items-center justify-center bg-slate-50 rounded-lg font-bold text-lg text-slate-400 border border-slate-100 active:bg-slate-200 transition">-</button>
                                        <span className="font-black text-sm min-w-[20px] text-center text-slate-800">{quantidades[p.id] || 0}</span>
                                        <button
                                            onClick={() => alterarQtd(p.id, 1, p.stock_quantity)}
                                            disabled={(quantidades[p.id] || 0) >= p.stock_quantity}
                                            className="w-8 h-8 flex items-center justify-center bg-slate-50 rounded-lg font-bold text-lg text-slate-400 border border-slate-100 active:bg-slate-200 transition disabled:opacity-30"
                                        >
                                            +
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Registro Fotográfico e pH */}
                <section>
                    <h2 className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-3">Registro e Medições</h2>
                    
                    {/* Fotos */}
                    <div className="grid grid-cols-5 gap-3 mb-3">
                        {/* Foto Antes - maior */}
                        <label className={`col-span-3 aspect-[4/3] rounded-xl border-2 border-dashed ${fotoAntes ? 'border-[#008080]/30 bg-white' : 'border-slate-300 bg-white'} flex flex-col items-center justify-center gap-2 hover:border-[#008080]/40 transition-colors active:scale-[0.98] cursor-pointer overflow-hidden relative`}>
                            {fotoAntes ? (
                                <img src={URL.createObjectURL(fotoAntes)} alt="Antes" className="w-full h-full object-cover" />
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 opacity-60"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                                    <span className="text-xs text-slate-500 font-medium text-center px-4">Foto Antes (Câmera ou Galeria)</span>
                                </>
                            )}
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => setFotoAntes(e.target.files[0])} />
                        </label>

                        {/* Foto Depois - menor */}
                        <label 
                            onClick={(e) => { if(!fotoAntes) { e.preventDefault(); alert("⚠️ Por favor, registre a 'Foto Antes' primeiro."); } }}
                            className={`col-span-2 aspect-[4/3] rounded-xl border-2 border-dashed ${fotoDepois ? 'border-[#008080]/30 bg-white' : !fotoAntes ? 'border-slate-200 bg-slate-50 opacity-40 cursor-not-allowed' : 'border-slate-300 bg-white'} flex flex-col items-center justify-center gap-2 hover:border-[#008080]/40 transition-colors active:scale-[0.98] cursor-pointer overflow-hidden relative`}
                        >
                            {!fotoAntes && <span className="absolute top-2 right-2 text-[10px]">🔒</span>}
                            {fotoDepois ? (
                                <img src={URL.createObjectURL(fotoDepois)} alt="Depois" className="w-full h-full object-cover" />
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 opacity-40"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
                                    <span className="text-[11px] text-slate-500 font-medium">Foto Depois</span>
                                </>
                            )}
                            <input type="file" accept="image/*" disabled={!fotoAntes} className="hidden" onChange={(e) => setFotoDepois(e.target.files[0])} />
                        </label>
                    </div>

                    {/* pH Inputs */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                        <input
                            type="number"
                            step="0.1"
                            placeholder="pH Antes"
                            value={phAntes}
                            onChange={(e) => setPhAntes(e.target.value)}
                            className="h-12 w-full rounded-xl text-center font-bold text-slate-800 bg-white border border-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#008080]/20 focus:border-[#008080] transition-all shadow-sm"
                        />
                        <input
                            type="number"
                            step="0.1"
                            placeholder="pH Depois"
                            value={phDepois}
                            onChange={(e) => setPhDepois(e.target.value)}
                            className={`h-12 w-full rounded-xl text-center font-bold text-slate-800 bg-white border border-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#008080]/20 focus:border-[#008080] transition-all shadow-sm ${!fotoAntes ? 'opacity-50' : ''}`}
                            disabled={!fotoAntes}
                        />
                    </div>

                    {/* Observação */}
                    <textarea
                        placeholder="Adicionar observação sobre a visita... (Opcional)"
                        value={observacao}
                        onChange={(e) => setObservacao(e.target.value)}
                        className="w-full p-4 rounded-xl bg-white border border-slate-200 min-h-[100px] resize-none placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#008080]/20 focus:border-[#008080] transition-all text-sm font-medium text-slate-800 shadow-sm"
                    ></textarea>
                </section>
            </div>

            {/* Rodapé Fixo Compacto */}
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 space-y-3 z-20">
                <div className="max-w-2xl mx-auto space-y-3">
                    <div>
                        <label className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block mb-1">
                            Valor Cobrado
                        </label>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm font-medium text-slate-500">R$</span>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                value={valorServico}
                                onChange={(e) => setValorServico(e.target.value)}
                                className="h-10 w-full border-0 border-b border-slate-200 rounded-none bg-transparent text-2xl font-light text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-0 focus:border-b-2 focus:border-[#008080] transition-all px-0 py-0"
                            />
                        </div>
                    </div>

                    <button
                        onClick={finalizarVisita}
                        disabled={enviando || !valorServico}
                        className="w-full flex items-center justify-center gap-3 bg-[#2ECC71] hover:bg-[#27ae60] text-white h-14 rounded-2xl font-bold tracking-wide active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 uppercase"
                    >
                        {enviando ? "SALVANDO..." : (
                            <>
                                FINALIZAR E ENVIAR
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </main>
    );
}
