'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [erro, setErro] = useState('');
    const [tentouEntrar, setTentouEntrar] = useState(false);
    const router = useRouter();

    const handleLogin = async (e) => {
        e.preventDefault();
        setErro('');
        setTentouEntrar(true);

        if (!email || !password) {
            return;
        }

        // A mágica acontece aqui: o Supabase confere o e-mail e a senha criptografada
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setErro('E-mail ou senha inválidos');
        } else {
            // Busca o usuário atual logado
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // Busca o company_id na tabela profiles
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('company_id')
                    .eq('id', user.id)
                    .single();

                if (profile) {
                    // Agora você pode salvar o company_id no localStorage ou estado global
                    localStorage.setItem('company_id', profile.company_id);
                    router.push('/home');
                } else {
                    setErro('Perfil de empresa não encontrado ❌');
                }
            }
        }
    };

    return (
        <main className="relative flex flex-col items-center justify-center min-h-dvh p-6 overflow-hidden font-sans">
            {/* Imagem de Fundo com Desfoque */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-1000"
                style={{
                    backgroundImage: 'url("/pool-login.jpg")',
                    filter: 'blur(8px) brightness(0.8)',
                    transform: 'scale(1.1)'
                }}
            />

            {/* Overlay Escuro Suave */}
            <div className="absolute inset-0 z-10 bg-black/20" />

            {/* Conteúdo de Login */}
            <div className="relative z-20 w-full max-w-md p-10">
                <div className="text-center mb-10">
                    <h1 className="text-5xl font-black text-white tracking-[-0.04em] drop-shadow-xl underline-offset-8">Pool Light</h1>
                    <p className="text-blue-100 font-medium mt-2 drop-shadow-sm tracking-tight text-lg opacity-90">Acesse sua jornada diária</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6" noValidate>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-white/80 ml-2 tracking-[0.1em] uppercase">E-MAIL</label>
                        <input
                            type="email"
                            placeholder="Seu e-mail"
                            className={`w-full px-6 py-4 bg-white/10 backdrop-blur-lg rounded-2xl outline-none transition-all placeholder:text-white/40 border tracking-tight
                                ${tentouEntrar && !email
                                    ? 'ring-2 ring-red-500 border-red-500 focus:bg-white/20'
                                    : 'focus:ring-2 ring-blue-400/50 text-white border-white/20 focus:bg-white/20'}`}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-white/80 ml-2 tracking-[0.1em] uppercase">SENHA</label>
                        <input
                            type="password"
                            placeholder="Sua senha"
                            className={`w-full px-6 py-4 bg-white/10 backdrop-blur-lg rounded-2xl outline-none transition-all placeholder:text-white/40 border tracking-tight
                                ${tentouEntrar && !password
                                    ? 'ring-2 ring-red-500 border-red-500 focus:bg-white/20'
                                    : 'focus:ring-2 ring-blue-400/50 text-white border-white/20 focus:bg-white/20'}`}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="flex items-center justify-start px-2 text-sm">
                        <label className="flex items-center gap-2 text-white/80 font-medium cursor-pointer drop-shadow-sm">
                            <input type="checkbox" className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-400" />
                            Lembrar de mim
                        </label>
                    </div>

                    {erro && (
                        <div className="bg-red-500/80 backdrop-blur-md text-white p-4 rounded-2xl text-sm font-bold text-center border border-red-400 shadow-lg animate-bounce tracking-tight">
                            {erro}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-white text-blue-700 py-5 rounded-3xl font-black text-xl shadow-2xl shadow-black/20 hover:bg-blue-50 active:scale-[0.98] transition-all tracking-tight"
                    >
                        ENTRAR NA CONTA
                    </button>
                </form>


                <p className="text-center mt-10 text-white/60 font-medium text-sm tracking-tight">
                    Não tem conta? <button className="text-white font-bold hover:underline">Solicite acesso</button>
                </p>
            </div>


        </main>
    );
}
