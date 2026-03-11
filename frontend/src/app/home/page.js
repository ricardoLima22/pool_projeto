// src/app/home/page.js
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function Home() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [weather, setWeather] = useState({ temp: null, city: '', icon: '' });
    const router = useRouter();

    useEffect(() => {
        async function fetchWeather(lat, lon) {
            try {
                // 1. Busca a cidade (Reverse Geocoding gratuito)
                const geoRes = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=pt`);
                const geoData = await geoRes.json();
                const cityName = geoData.city || geoData.locality || 'Sua Localização';

                // 2. Busca a temperatura (Open-Meteo - Gratuito e sem chave)
                const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
                const weatherData = await weatherRes.json();

                if (weatherData.current_weather) {
                    setWeather({
                        temp: Math.round(weatherData.current_weather.temperature),
                        city: cityName,
                        icon: weatherData.current_weather.weathercode
                    });
                }
            } catch (err) {
                console.error("Erro ao carregar clima:", err);
            }
        }

        async function fetchUser() {
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                router.push('/login');
                return;
            }

            const { data: userProfile } = await supabase
                .from('profiles')
                .select('full_name, company_id')
                .eq('id', user.id)
                .single();

            if (userProfile) {
                setProfile(userProfile);
            }
            setLoading(false);

            // Tenta pegar a localização para o clima
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
                    (err) => console.log("Permissão de localização negada ou erro:", err)
                );
            }
        }

        fetchUser();
    }, [router]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-slate-50 flex items-center justify-center">
                <div className="flex flex-col items-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-slate-500 font-bold uppercase tracking-widest text-sm">Carregando painel...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-900">
            {/* Cabeçalho Premium */}
            <header className="bg-blue-600 text-white rounded-b-[40px] px-6 pt-12 pb-8 shadow-xl shadow-blue-200">
                <div className="flex justify-between items-start mb-8">
                    <div className="flex flex-col">
                        <h2 className="text-2xl font-black mb-1 tracking-tight">Olá, {profile?.full_name || 'Usuário'}!</h2>
                        <p className="text-blue-100 font-medium opacity-90 tracking-tight text-base">O que vamos fazer hoje?</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="bg-white/10 hover:bg-white/20 px-5 py-2.5 rounded-xl text-sm font-bold backdrop-blur-md transition-all active:scale-95 border border-white/10"
                    >
                        Sair
                    </button>
                </div>

                {/* Weather Card */}
                {weather.temp !== null && (
                    <div className="bg-gradient-to-br from-blue-400 to-indigo-500 p-4 rounded-[24px] shadow-lg shadow-blue-900/20 relative overflow-hidden active:scale-[0.98] transition-all flex items-center gap-4">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl -mr-8 -mt-8"></div>
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-3xl backdrop-blur-sm">
                            {weather.icon <= 3 ? '☀️' : weather.icon <= 67 ? '☁️' : '🌧️'}
                        </div>
                        <div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-3xl font-black tracking-tighter">{weather.temp}°C</span>
                                <span className="text-blue-100 text-xs font-bold uppercase tracking-widest opacity-80">{weather.city}</span>
                            </div>
                            <p className="text-blue-50 text-[10px] font-bold uppercase tracking-widest mt-0.5 opacity-90">Tempo agora na sua região</p>
                        </div>
                    </div>
                )}
            </header>

            <div className="p-6">
                <h2 className="text-slate-800 font-black text-xl mb-4">Acesso Rápido</h2>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    {/* Botão Gigante de Visita */}
                    <button
                        onClick={() => router.push('/visita/nova')}
                        className="col-span-2 bg-gradient-to-br from-emerald-400 to-green-500 p-6 rounded-[30px] shadow-lg shadow-emerald-200 text-left relative overflow-hidden active:scale-[0.98] transition-all group"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full blur-2xl -mr-10 -mt-10 group-active:scale-110 transition-transform"></div>
                        <h3 className="text-white font-black text-2xl leading-tight mb-1">Registrar<br />Visita</h3>
                        <p className="text-emerald-50 text-sm font-medium">Fotos e Cobrança</p>
                    </button>

                    {/* Botão de Clientes */}
                    <button
                        onClick={() => router.push('/clientes')}
                        className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-100 text-left active:scale-[0.98] active:bg-blue-50 transition-all flex flex-col justify-between"
                    >
                        <div>
                            <h3 className="text-slate-800 font-black text-lg leading-none mb-1">Meus<br />Clientes</h3>
                            <p className="text-slate-400 text-xs font-bold mt-1">Sua carteira</p>
                        </div>
                    </button>

                    {/* Botão Novo Cliente */}
                    <button
                        onClick={() => router.push('/clientes/novo')}
                        className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-100 text-left active:scale-[0.98] active:bg-blue-50 transition-all flex flex-col justify-between"
                    >
                        <div>
                            <h3 className="text-slate-800 font-black text-lg leading-none mb-1">Novo<br />Cliente</h3>
                            <p className="text-slate-400 text-xs font-bold mt-1">Cadastrar</p>
                        </div>
                    </button>

                    {/* Botão de Produtos */}
                    <button
                        onClick={() => router.push('/produtos')}
                        className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-100 text-left active:scale-[0.98] active:indigo-50 transition-all flex flex-col justify-between"
                    >
                        <div>
                            <h3 className="text-slate-800 font-black text-lg leading-none mb-1">Meus<br />Produtos</h3>
                            <p className="text-slate-400 text-xs font-bold mt-1">Seu estoque</p>
                        </div>
                    </button>

                    {/* Botão Novo Produto */}
                    <button
                        onClick={() => router.push('/produtos/novo')}
                        className="bg-white p-5 rounded-[24px] shadow-sm border border-slate-100 text-left active:scale-[0.98] active:indigo-50 transition-all flex flex-col justify-between"
                    >
                        <div>
                            <h3 className="text-slate-800 font-black text-lg leading-none mb-1">Novo<br />Produto</h3>
                            <p className="text-slate-400 text-xs font-bold mt-1">Cadastrar</p>
                        </div>
                    </button>
                </div>

                {/* Banner de Ajuda ou Resumo (Opcional, futuro) */}
                <div className="bg-slate-800 text-white p-6 rounded-[24px] shadow-md bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="font-black text-lg mb-2">Seu negócio está crescendo!</h3>
                        <p className="text-slate-300 text-sm mb-4">Mantenha seu estoque atualizado para gerar relatórios precisos no futuro.</p>
                        <div className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-bold backdrop-blur-sm">
                            Em breve: Relatórios 📊
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
