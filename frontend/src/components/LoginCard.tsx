"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Droplets, Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useRouter } from "next/navigation";

const LoginCard = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [tentouEntrar, setTentouEntrar] = useState(false);

  const router = useRouter();

  const isValid = email.length > 3 && password.length > 3;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setTentouEntrar(true);
    
    if (!email || !password || !isValid) return;
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setErro("E-mail ou senha inválidos");
        setIsLoading(false);
      } else {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("company_id, role_id, roles(name)")
            .eq("id", user.id)
            .single();

          if (profile) {
            localStorage.setItem("company_id", profile.company_id);
            if (profile.role_id) {
              localStorage.setItem("role_id", profile.role_id);
            }
            if (profile.roles) {
              const roleName = Array.isArray(profile.roles) 
                ? profile.roles[0]?.name 
                : (profile.roles as any)?.name;
              
              if (roleName) {
                localStorage.setItem("user_role", roleName);
                
                if (roleName.toLowerCase() === 'funcionario') {
                  setErro("Acesso de funcionário em desenvolvimento 🚧");
                  setIsLoading(false);
                  await supabase.auth.signOut(); // Desloga pro usuário não ficar preso
                  return;
                }
              }
            }
            router.push("/home");
          } else {
            setErro("Perfil de empresa não encontrado ❌");
            setIsLoading(false);
          }
        }
      }
    } catch (err) {
      setErro("Ocorreu um erro ao fazer login.");
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
      className="w-full max-w-[420px] mx-auto px-4"
    >
      {/* Top brand area */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Droplets className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-primary">
          Pool Light
        </h1>
      </div>

      {/* Card */}
      <div
        className="bg-card rounded-[24px] p-8 sm:p-10 relative"
        style={{
          boxShadow:
            "0 0 0 1px rgba(0,0,0,.05), 0 20px 25px -5px rgba(0,0,0,.1), 0 10px 10px -5px rgba(0,0,0,.04)",
        }}
      >
        {/* Welcome */}
        <h2 className="text-xl font-semibold text-card-foreground text-center mb-1">
          Bem-vindo ao Pool Light!
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Acesse sua jornada diária.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-card-foreground">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seuemail@exemplo.com"
              className={`w-full h-12 px-4 rounded-xl border border-border bg-card text-card-foreground 
                         text-base placeholder:text-muted-foreground/50
                         focus:outline-none focus:ring-2 focus:ring-ring/30 transition-shadow
                         ${tentouEntrar && !email ? "border-red-500 focus:ring-red-500/30" : ""}`}
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-card-foreground">
              Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full h-12 px-4 pr-12 rounded-xl border border-border bg-card text-card-foreground 
                           text-base placeholder:text-muted-foreground/50
                           focus:outline-none focus:ring-2 focus:ring-ring/30 transition-shadow
                           ${tentouEntrar && !password ? "border-red-500 focus:ring-red-500/30" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground 
                           hover:text-card-foreground transition-colors"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Remember me + Forgot */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <div
                onClick={() => setRememberMe(!rememberMe)}
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                  rememberMe
                    ? "bg-primary border-primary"
                    : "border-muted-foreground/40 bg-transparent"
                }`}
              >
                {rememberMe && (
                  <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-sm text-muted-foreground">Lembrar de mim</span>
            </label>
            <button
              type="button"
              className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Esqueceu a senha?
            </button>
          </div>

          {erro && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium text-center border border-red-200"
            >
              {erro}
            </motion.div>
          )}

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={!isValid || isLoading}
            whileTap={isValid ? { scale: 0.98 } : undefined}
            whileHover={isValid ? { scale: 1.02 } : undefined}
            className="w-full h-12 bg-primary text-primary-foreground font-bold text-sm uppercase 
                       tracking-wider rounded-xl transition-all duration-200
                       disabled:opacity-40 disabled:cursor-not-allowed mt-2"
            style={{
              boxShadow: isValid
                ? "0 4px 14px 0 rgba(14,165,233,0.39)"
                : "none",
            }}
          >
            {isLoading ? (
              <motion.div
                className="flex items-center justify-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <motion.div
                  className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                />
                Entrando...
              </motion.div>
            ) : (
              "LOGIN"
            )}
          </motion.button>
        </form>
      </div>

      {/* Footer */}
      <p className="text-xs text-foreground/30 text-center mt-6">
        © 2026 Pool Light · Gestão inteligente de piscinas
      </p>
    </motion.div>
  );
};

export default LoginCard;
