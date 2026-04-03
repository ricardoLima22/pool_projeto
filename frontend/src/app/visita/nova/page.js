// src/app/visita/nova/page.js
'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '../../../lib/supabase';
import { useSearchParams, useRouter } from 'next/navigation';
import SplashScreen from '../../../components/SplashScreen';
import { ArrowLeft, Camera, Sparkles, Minus, Plus, Send } from 'lucide-react';
import { toast } from 'sonner';

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
    const chamadoId = searchParams.get('chamadoId');
    const [cliente, setCliente] = useState(null);
    const [clientesList, setClientesList] = useState([]);
    const [busca, setBusca] = useState('');
    const [produtos, setProdutos] = useState([]);
    const [quantidades, setQuantidades] = useState({});
    const [loading, setLoading] = useState(true);
    const [companySession, setCompanySession] = useState('');
    const [userProfile, setUserProfile] = useState(null);

    // Novos campos do planejamento
    const [fotoAntes, setFotoAntes] = useState(null);
    const [fotoDepois, setFotoDepois] = useState(null);
    const [valorServico, setValorServico] = useState('');
    const [phAntes, setPhAntes] = useState('');
    const [phDepois, setPhDepois] = useState('');
    const [observacao, setObservacao] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [erros, setErros] = useState({});

    const router = useRouter();

    useEffect(() => {
        async function carregarDados() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('company_id, full_name').eq('id', user.id).single();
                setUserProfile(profile);

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
                toast.error(`Erro ao subir arquivo ${prefix}: ${uploadError.message}`);
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
        // Valida campos obrigatórios via borda vermelha, sem toast
        const novosErros = {};

        if (!valorServico || isNaN(parseFloat(valorServico)) || parseFloat(valorServico) < 0) {
            novosErros.valorServico = true;
        }

        if (phAntes === '') {
            novosErros.phAntes = true;
        } else {
            const phA = parseFloat(phAntes);
            if (isNaN(phA) || phA < 0 || phA > 14) novosErros.phAntes = true;
        }

        if (phDepois === '') {
            novosErros.phDepois = true;
        } else {
            const phD = parseFloat(phDepois);
            if (isNaN(phD) || phD < 0 || phD > 14) novosErros.phDepois = true;
        }

        if (Object.keys(novosErros).length > 0) {
            setErros(novosErros);
            return;
        }

        setErros({});

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

        if (visitError) {
            console.error("Erro ao salvar visita:", visitError);
            toast.error('Erro ao salvar a visita: ' + visitError.message);
            setEnviando(false);
            return;
        }

        // Se chegou aqui, a visita foi salva com sucesso
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

        // Fechar chamado automaticamente se a visita veio de um
        if (chamadoId) {
            const { error: updateErr, data: updData } = await supabase
                .from('service_requests')
                .update({ status: 'Concluido' })
                .eq('id', chamadoId)
                .select();

            if (updateErr) {
                console.error("ERRO SUPABASE UPDATE CHAMADO:", updateErr);
                toast.warning('A visita foi salva, mas houve um erro ao fechar o chamado: ' + updateErr.message);
            } else if (!updData || updData.length === 0) {
                // Silencioso ou aviso leve, pois o chamado pode já estar concluído
                console.warn("Aviso: O chamado não pôde ser atualizado para Concluído.");
            }
        }

        // Limpa o número do WhatsApp (mantém apenas dígitos)
        let whatsappLimpo = cliente.whatsapp.replace(/\D/g, '');

        let isBrazilian = false;
        if (whatsappLimpo.length === 11) {
            const regexCelularBR = /^[1-9][1-9]9\d{8}$/;
            if (regexCelularBR.test(whatsappLimpo)) isBrazilian = true;
        } else if (whatsappLimpo.length === 10) {
            const regexFixoBR = /^[1-9][1-9][2-8]\d{7}$/;
            if (regexFixoBR.test(whatsappLimpo)) isBrazilian = true;
        } else if (whatsappLimpo.length < 10) {
            isBrazilian = true;
        }

        // Garante que o número tenha o DDI 55 (Brasil) se for local
        if (isBrazilian && !whatsappLimpo.startsWith('55')) {
            whatsappLimpo = `55${whatsappLimpo}`;
        }

        
        // Monta a mensagem do WhatsApp adaptada para o novo formato
        let msg = `Olá ${cliente.name}! ✅ A manutenção da sua piscina foi finalizada.\n\n` +
            `*Status da Água:*\n` +
            (phAntes ? `- pH Inicial (Antes): ${phAntes}\n` : '') +
            (phDepois ? `- pH Final (Depois): ${phDepois}\n` : '');

        // FUNCIONALIDADE PRONTA PARA O FUTURO (Apenas descomente abaixo quando quiser ativar em produção)
        if (userProfile && userProfile.full_name) {
             msg += `Responsável pela Limpeza: ${userProfile.full_name}\n\n`;
        }

        if (itensTexto.length > 0) {
            msg += `*Produtos Entregues:*\n- ${itensTexto.join('\n- ')}\n\n`+
            `\n*Valor do Serviço:*\n` +
            `R$ ${parseFloat(valorServico).toFixed(2)}\n\n`;
        }

        if (observacao) {
            msg += `*Observações:*\n${observacao}\n\n`;
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
                toast.success('Visita salva! Sua mensagem será enviada pelo WhatsApp da empresa em instantes.');
                router.push('/home');
            } else {
                const erroData = await botResponse.json();
                console.error("Falha ao acionar bot:", erroData);
                toast.warning('A visita foi salva, mas houve um erro ao acionar o robô de WhatsApp.');
                router.push('/home');
            }
        } catch (error) {
            console.error("Erro fatal ao acionar bot:", error);
            toast.warning('Visita salva, mas o robô de envio está inacessível no momento.');
            router.push('/home');
        }
    };

    // Filtro de busca em tempo real
    const clientesFiltrados = clientesList.filter(c =>
        c.name.toLowerCase().includes(busca.toLowerCase())
    );

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

                <div className="px-4 py-6 space-y-4">
                    {/* Search - idêntico ao /clientes */}
                    <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                        <input
                            type="text"
                            placeholder="Buscar cliente..."
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                            className="w-full pl-9 pr-4 py-3 rounded-xl bg-white border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#008080]/40 transition-colors shadow-sm"
                        />
                    </div>

                    <p className="text-[11px] font-semibold tracking-wide text-[#008080] uppercase block">Selecione o Cliente</p>
                    <div className="space-y-3">
                        {clientesFiltrados.map(c => (
                            <button
                                key={c.id}
                                onClick={() => setCliente(c)}
                                className="w-full bg-white rounded-xl border border-slate-100 p-4 flex items-center justify-between hover:border-[#008080]/30 transition-colors text-left shadow-sm active:scale-[0.99]"
                            >
                                <div className="space-y-1">
                                    <p className="font-bold text-slate-800 text-sm">{c.name}</p>
                                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                        <svg className="h-3 w-3 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                                        {c.address || 'Endereço não informado'}
                                    </p>
                                    <span className="inline-block mt-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded uppercase">
                                        {c.pool_volume_m3 || 0} M³
                                    </span>
                                </div>
                                <svg className="h-5 w-5 text-[#008080]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                            </button>
                        ))}

                        {clientesFiltrados.length === 0 && (
                            <div className="text-center py-10">
                                <p className="text-slate-400 text-sm">Nenhum cliente encontrado.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        );
    }


    return (
        <div className="min-h-screen bg-[#fcfbf8] pb-6">
            {/* Header */}
            <div className="fixed top-0 left-0 right-0 px-4 py-4 flex items-center gap-3 bg-white border-b border-slate-200 z-50">
                <button 
                    onClick={() => {
                        if (!clienteId) setCliente(null);
                        else router.back();
                    }} 
                    className="text-slate-800 transition-colors p-1 -ml-1"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div className="text-slate-800 overflow-hidden">
                    <h1 className="font-bold text-lg leading-tight truncate">{cliente?.name}</h1>
                    <p className="text-sm text-slate-500 truncate">{cliente?.pool_volume_m3 || 0}m³ • {cliente?.address || 'Sem endereço'}</p>
                </div>
            </div>

            <div className="px-4 space-y-6 pt-24">
                {/* Produtos Utilizados */}
                <div>
                    <h2 className="text-xs font-bold tracking-widest text-[#008080] mb-3">
                        PRODUTOS ENTREGUES
                    </h2>
                    {produtos.length === 0 ? (
                        <div className="rounded-xl border border-slate-200 bg-white py-6 text-center shadow-sm">
                            <p className="text-sm font-medium text-slate-400">Nenhum produto em estoque.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {produtos.map(p => (
                                <div key={p.id} className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                                    <div>
                                        <p className="font-semibold text-sm text-slate-800">{p.name}</p>
                                        <p className="text-xs text-[#008080] font-medium mt-0.5">Disponível: {p.stock_quantity} {p.unit}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={() => alterarQtd(p.id, -1, p.stock_quantity)} 
                                            className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors active:scale-95"
                                        >
                                            <Minus className="h-4 w-4" />
                                        </button>
                                        <span className="w-6 text-center font-bold text-slate-800 text-sm">
                                            {quantidades[p.id] || 0}
                                        </span>
                                        <button
                                            onClick={() => alterarQtd(p.id, 1, p.stock_quantity)}
                                            disabled={(quantidades[p.id] || 0) >= p.stock_quantity}
                                            className="w-8 h-8 rounded-full border border-[#008080]/30 bg-[#008080]/5 flex items-center justify-center text-[#008080] hover:bg-[#008080]/10 transition-colors active:scale-95 disabled:opacity-30 disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Registro e Medições */}
                <div>
                    <h2 className="text-xs font-bold tracking-widest text-[#008080] mb-3">
                        REGISTRO E MEDIÇÕES
                    </h2>

                    {/* Fotos */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <label className={`flex flex-col items-center justify-center gap-2 h-40 rounded-xl border-2 border-dashed ${fotoAntes ? 'border-[#008080]/40 bg-white shadow-sm' : 'border-[#008080]/30 bg-[#008080]/5'} hover:bg-[#008080]/10 transition-colors cursor-pointer overflow-hidden relative`}>
                            {fotoAntes ? (
                                <img src={URL.createObjectURL(fotoAntes)} alt="Antes" className="w-full h-full object-cover" />
                            ) : (
                                <>
                                    <Camera className="h-6 w-6 text-[#008080]/50" />
                                    <span className="text-xs text-[#008080]/70 font-medium text-center px-4">Foto Antes (Câmera ou Galeria)</span>
                                </>
                            )}
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => setFotoAntes(e.target.files[0])} />
                        </label>

                        <label 
                            onClick={(e) => { if(!fotoAntes) { e.preventDefault(); toast.error('Por favor, registre a Foto Antes primeiro.'); } }}
                            className={`flex flex-col items-center justify-center gap-2 h-40 rounded-xl border-2 border-dashed ${fotoDepois ? 'border-[#2ECC71]/40 bg-white shadow-sm' : !fotoAntes ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed' : 'border-[#2ECC71]/40 bg-[#2ECC71]/5'} hover:bg-[#2ECC71]/10 transition-colors cursor-pointer overflow-hidden relative`}
                        >
                            {fotoDepois ? (
                                <img src={URL.createObjectURL(fotoDepois)} alt="Depois" className="w-full h-full object-cover" />
                            ) : (
                                <>
                                    <Sparkles className={`h-6 w-6 ${!fotoAntes ? 'text-slate-400' : 'text-[#2ECC71]/50'}`} />
                                    <span className={`text-xs font-medium ${!fotoAntes ? 'text-slate-500' : 'text-[#2ECC71]/70'}`}>Foto Depois</span>
                                    {fotoAntes && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#2ECC71]" />}
                                </>
                            )}
                            <input type="file" accept="image/*" disabled={!fotoAntes} className="hidden" onChange={(e) => setFotoDepois(e.target.files[0])} />
                        </label>
                    </div>

                    {/* pH */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="14"
                            placeholder="pH Antes"
                            value={phAntes}
                            onChange={(e) => {
                                let val = e.target.value;
                                setErros(prev => ({ ...prev, phAntes: false }));
                                if (val === '') { setPhAntes(val); return; }
                                if (val.length > 1 && /^0[^.]/.test(val)) val = Number(val).toString();
                                if (val.length <= 4 && Number(val) >= 0 && Number(val) <= 14) setPhAntes(val);
                            }}
                            className={`h-12 w-full text-center border-2 rounded-xl bg-white text-[16px] font-medium text-slate-700 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-0 transition-colors shadow-sm ${erros.phAntes ? 'border-red-500 bg-red-50' : 'border-slate-200 focus:border-[#008080]'}`}
                            onKeyDown={(e) => {
                                if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault();
                            }}
                        />
                        <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="14"
                            placeholder="pH Depois"
                            value={phDepois}
                            onChange={(e) => {
                                let val = e.target.value;
                                setErros(prev => ({ ...prev, phDepois: false }));
                                if (val === '') { setPhDepois(val); return; }
                                if (val.length > 1 && /^0[^.]/.test(val)) val = Number(val).toString();
                                if (val.length <= 4 && Number(val) >= 0 && Number(val) <= 14) setPhDepois(val);
                            }}
                            className={`h-12 w-full text-center border-2 rounded-xl bg-white text-[16px] font-medium text-slate-700 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-0 transition-colors shadow-sm ${!fotoAntes ? 'opacity-50' : ''} ${erros.phDepois ? 'border-red-500 bg-red-50' : 'border-slate-200 focus:border-[#008080]'}`}
                            disabled={!fotoAntes}
                            onKeyDown={(e) => {
                                if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault();
                            }}
                        />
                    </div>

                    {/* Observação */}
                    <div className="relative">
                        <textarea
                            placeholder="Adicionar observação sobre a visita... (Opcional)"
                            value={observacao}
                            maxLength={500}
                            onChange={(e) => setObservacao(e.target.value)}
                            className="w-full bg-white border-2 border-slate-200 rounded-xl min-h-[100px] p-4 pb-8 resize-none focus:outline-none focus:border-[#008080] focus:ring-0 transition-colors shadow-sm text-[16px]"
                        ></textarea>
                        <span className="absolute bottom-3 right-4 text-[10px] text-slate-400 font-medium">
                            {observacao.length}/500
                        </span>
                    </div>
                </div>

                {/* Valor Cobrado */}
                <div>
                    <h2 className="text-xs font-bold tracking-widest text-[#008080] mb-3">
                        VALOR COBRADO
                    </h2>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-400">R$</span>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0,00"
                            value={valorServico}
                            onChange={(e) => { setValorServico(e.target.value); setErros(prev => ({ ...prev, valorServico: false })); }}
                            className={`border-0 border-b-2 rounded-none bg-transparent text-[18px] font-bold focus:outline-none focus:ring-0 transition-colors w-full px-0 py-1 ${erros.valorServico ? 'border-red-500 text-red-600' : 'border-[#008080]/30 text-slate-800 focus:border-[#008080]'}`}
                        />
                    </div>
                </div>

                {/* Botão Finalizar */}
                <button
                    onClick={finalizarVisita}
                    disabled={enviando || !valorServico}
                    className="w-full flex items-center justify-center bg-[#2ECC71] hover:bg-[#27ae60] text-white h-14 rounded-xl font-bold tracking-wide active:scale-[0.98] transition-all shadow-md disabled:opacity-50 disabled:active:scale-100 mt-8 mb-4"
                >
                    {enviando ? "SALVANDO..." : (
                        <>
                            FINALIZAR E ENVIAR
                            <Send className="h-5 w-5 ml-2" />
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
