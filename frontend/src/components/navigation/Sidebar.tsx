'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Camera,
  Users,
  Wrench,
  Package,
  Tag,
  Layers,
  DollarSign,
  Wallet,
  LogOut,
  X,
  Droplets,
  ChevronLeft,
  ChevronRight,
  Shield,
  User as UserIcon,
  ChevronDown
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';

export interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  adminOnly?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: 'Principal',
    items: [
      { name: 'Início', href: '/home', icon: LayoutDashboard },
      { name: 'Registrar Visita', href: '/visita/nova', icon: Camera },
    ],
  },
  {
    title: 'Operacional',
    items: [
      { name: 'Clientes', href: '/clientes', icon: Users },
      { name: 'Chamados', href: '/chamados', icon: Wrench },
      { name: 'Produtos & Estoque', href: '/produtos', icon: Package },
      { name: 'Marcas', href: '/marcas/nova', icon: Tag },
      { name: 'Tipos de Serviços', href: '/servicos/novo', icon: Layers },
    ],
  },
  {
    title: 'Gestão & Finanças',
    items: [
      { name: 'Financeiro', href: '/financeiro', icon: DollarSign, adminOnly: true },
      { name: 'Comissões', href: '/funcionarios/comissoes', icon: Wallet, adminOnly: true },
    ],
  },
];

interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  isDesktopCollapsed?: boolean;
  onToggleDesktopCollapse?: () => void;
}

export default function Sidebar({
  isMobileOpen = false,
  onMobileClose = () => {},
  isDesktopCollapsed = false,
  onToggleDesktopCollapse,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [profile, setProfile] = useState<{
    full_name?: string;
    roleName?: string;
    email?: string;
  } | null>(null);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    async function loadUserProfile() {
      try {
        const storedRole = localStorage.getItem('user_role');
        if (storedRole) setUserRole(storedRole.toLowerCase());

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('full_name, role_id, roles(name)')
            .eq('id', user.id)
            .single();

          const roleName = Array.isArray(userProfile?.roles)
            ? userProfile?.roles[0]?.name
            : (userProfile?.roles as { name?: string } | undefined)?.name;

          const activeRole = roleName || storedRole || 'Usuário';
          setUserRole(activeRole.toLowerCase());

          setProfile({
            full_name: userProfile?.full_name || user.email?.split('@')[0] || 'Usuário',
            roleName: activeRole,
            email: user.email || '',
          });
        }
      } catch (err) {
        console.error('Erro ao carregar perfil para a Sidebar:', err);
      }
    }

    loadUserProfile();
  }, []);

  const handleLogout = async () => {
    try {
      localStorage.removeItem('company_id');
      localStorage.removeItem('role_id');
      localStorage.removeItem('user_role');
      await supabase.auth.signOut();
      toast.success('Você saiu com sucesso!');
      router.push('/login');
    } catch (err) {
      console.error('Erro ao deslogar:', err);
      router.push('/login');
    }
  };

  const isRouteActive = (href: string) => {
    if (href === '/home') return pathname === '/home';
    if (href === '/visita/nova') return pathname.startsWith('/visita');
    if (href === '/marcas/nova') return pathname.startsWith('/marcas');
    if (href === '/servicos/novo') return pathname.startsWith('/servicos');
    return pathname.startsWith(href);
  };

  const isFuncionario = userRole === 'funcionario';

  // Render navigation links list
  const renderNavItems = () => (
    <div className="space-y-6 px-3 py-4">
      {navSections.map((section, sIdx) => {
        const visibleItems = section.items.filter(
          (item) => !item.adminOnly || !isFuncionario
        );

        if (visibleItems.length === 0) return null;

        return (
          <div key={sIdx} className="space-y-1">
            {!isDesktopCollapsed && (
              <h3 className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400/80 mb-2 select-none">
                {section.title}
              </h3>
            )}
            <div className="space-y-1">
              {visibleItems.map((item) => {
                const active = isRouteActive(item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                      if (onMobileClose) onMobileClose();
                    }}
                    title={isDesktopCollapsed ? item.name : undefined}
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative ${
                      active
                        ? 'bg-gradient-to-r from-cyan-500/20 to-cyan-500/5 text-cyan-300 font-semibold border-l-[3px] border-cyan-400 shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                    } ${isDesktopCollapsed ? 'justify-center px-2' : ''}`}
                  >
                    <div
                      className={`transition-transform duration-200 group-hover:scale-110 shrink-0 ${
                        active ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]' : 'text-slate-400 group-hover:text-slate-200'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    {!isDesktopCollapsed && (
                      <span className="truncate flex-1 tracking-tight">{item.name}</span>
                    )}

                    {item.badge && !isDesktopCollapsed && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  // User Profile & Logout Section
  const renderUserProfile = () => {
    const initials = profile?.full_name
      ? profile.full_name
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase()
      : 'PA';

    return (
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/60 mt-auto">
        {!isDesktopCollapsed ? (
          <div className="flex items-center justify-between gap-3 p-2 rounded-xl bg-slate-800/50 border border-slate-700/50">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center font-bold text-xs text-white shadow-sm ring-2 ring-cyan-500/30 shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-100 truncate">
                  {profile?.full_name || 'Carregando...'}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Shield className="h-3 w-3 text-cyan-400 shrink-0" />
                  <p className="text-[10px] font-medium text-slate-400 capitalize truncate">
                    {profile?.roleName || 'Usuário'}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sair do sistema"
              className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div
              title={profile?.full_name || 'Usuário'}
              className="h-9 w-9 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center font-bold text-xs text-white shadow-sm ring-2 ring-cyan-500/30 cursor-pointer"
            >
              {initials}
            </div>
            <button
              onClick={handleLogout}
              title="Sair da conta"
              className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          1. DESKTOP SIDEBAR (Fixa na lateral esquerda em telas >= md)
          ───────────────────────────────────────────────────────────── */}
      <aside
        className={`hidden md:flex flex-col fixed top-0 bottom-0 left-0 z-40 bg-slate-900 text-slate-100 border-r border-slate-800/90 shadow-2xl transition-all duration-300 ease-in-out ${
          isDesktopCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40">
          <Link
            href="/home"
            className={`flex items-center gap-2.5 overflow-hidden transition-opacity hover:opacity-90 ${
              isDesktopCollapsed ? 'justify-center w-full' : ''
            }`}
          >
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
              <Droplets className="h-5 w-5 text-white" />
            </div>
            {!isDesktopCollapsed && (
              <div className="flex flex-col">
                <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                  Pureza Azul
                </span>
                <span className="text-[10px] text-cyan-400/90 font-medium -mt-1 tracking-wider uppercase">
                  Gestão & Piscinas
                </span>
              </div>
            )}
          </Link>

          {/* Toggle collapse button (se handler fornecido) */}
          {onToggleDesktopCollapse && !isDesktopCollapsed && (
            <button
              onClick={onToggleDesktopCollapse}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Recolher menu"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}

          {onToggleDesktopCollapse && isDesktopCollapsed && (
            <button
              onClick={onToggleDesktopCollapse}
              className="absolute -right-3 top-6 bg-slate-800 text-slate-300 hover:text-white border border-slate-700 rounded-full p-1 shadow-md hover:bg-cyan-600 transition-colors"
              title="Expandir menu"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Navigation items (com scrollbar suave) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
          {renderNavItems()}
        </div>

        {/* User profile footer */}
        {renderUserProfile()}
      </aside>

      {/* ─────────────────────────────────────────────────────────────
          2. MOBILE DRAWER (Gaveta deslizante com as 3 barrinhas)
          ───────────────────────────────────────────────────────────── */}
      {/* Backdrop escurecido */}
      <div
        className={`md:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${
          isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onMobileClose}
        aria-hidden="true"
      />

      {/* Drawer deslizante da esquerda */}
      <div
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-[82vw] max-w-xs bg-slate-900 text-slate-100 flex flex-col shadow-2xl border-r border-slate-800 transform transition-transform duration-300 ease-out ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header do Drawer com botão X */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800/90 bg-slate-950/60 pt-[env(safe-area-inset-top)]">
          <Link
            href="/home"
            onClick={onMobileClose}
            className="flex items-center gap-2.5"
          >
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Droplets className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white block">
                Pureza Azul
              </span>
              <span className="text-[10px] text-cyan-400 font-medium -mt-1 tracking-wider uppercase block">
                Gestão & Piscinas
              </span>
            </div>
          </Link>

          <button
            onClick={onMobileClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 active:scale-95 transition-all"
            aria-label="Fechar menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Links de Navegação */}
        <div className="flex-1 overflow-y-auto px-1 py-2">
          {renderNavItems()}
        </div>

        {/* Perfil e Logout */}
        <div className="pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          {renderUserProfile()}
        </div>
      </div>
    </>
  );
}
