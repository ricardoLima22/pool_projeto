'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { Menu, ArrowLeft, Droplets, Bell } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface SidebarContextType {
  isMobileOpen: boolean;
  openMobileMenu: () => void;
  closeMobileMenu: () => void;
  toggleMobileMenu: () => void;
  isDesktopCollapsed: boolean;
  toggleDesktopCollapse: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function useAppSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useAppSidebar must be used within an AppLayout or SidebarProvider');
  }
  return context;
}

interface AppLayoutProps {
  children: React.ReactNode;
  /** Título da página exibido no cabeçalho */
  title?: string;
  /** Subtítulo ou descrição */
  subtitle?: string;
  /** Se deve exibir botão de voltar */
  showBackButton?: boolean;
  /** Rota personalizada para onde o botão de voltar navega (padrão: /home) */
  backHref?: string;
  /** Ações adicionais no cabeçalho (ex: botões de Novo, Filtros) */
  headerActions?: React.ReactNode;
  /** Se a própria página customiza o cabeçalho completamente (ex: /home com gradient hero) */
  customHeader?: boolean;
  /** Classes CSS extras para o container principal */
  className?: string;
}

export default function AppLayout({
  children,
  title,
  subtitle,
  showBackButton = false,
  backHref = '/home',
  headerActions,
  customHeader = false,
  className = '',
}: AppLayoutProps) {
  const router = useRouter();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktopCollapsed, setIsDesktopCollapsed] = useState(false);

  // Carrega preferência de colapso do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('pureza_sidebar_collapsed');
      if (saved !== null) {
        setIsDesktopCollapsed(saved === 'true');
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const handleToggleDesktopCollapse = () => {
    setIsDesktopCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('pureza_sidebar_collapsed', String(next));
      } catch (e) {}
      return next;
    });
  };

  const contextValue: SidebarContextType = {
    isMobileOpen,
    openMobileMenu: () => setIsMobileOpen(true),
    closeMobileMenu: () => setIsMobileOpen(false),
    toggleMobileMenu: () => setIsMobileOpen((prev) => !prev),
    isDesktopCollapsed,
    toggleDesktopCollapse: handleToggleDesktopCollapse,
  };

  return (
    <SidebarContext.Provider value={contextValue}>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        {/* Sidebar Component (Desktop Fixo + Drawer Mobile) */}
        <Sidebar
          isMobileOpen={isMobileOpen}
          onMobileClose={() => setIsMobileOpen(false)}
          isDesktopCollapsed={isDesktopCollapsed}
          onToggleDesktopCollapse={handleToggleDesktopCollapse}
        />

        {/* Content Wrapper com Recuo para a Sidebar no Desktop */}
        <div
          className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${
            isDesktopCollapsed ? 'md:pl-20' : 'md:pl-64'
          }`}
        >
          {/* Cabeçalho Padrão (se não for customHeader) */}
          {!customHeader && (
            <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3.5 flex items-center justify-between shadow-xs pt-[calc(0.875rem+env(safe-area-inset-top))]">
              <div className="flex items-center gap-3">
                {/* Botão das 3 Barrinhas (Mobile) */}
                <button
                  type="button"
                  onClick={() => setIsMobileOpen(true)}
                  className="md:hidden p-2 -ml-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition-all"
                  aria-label="Abrir menu de navegação"
                >
                  <Menu className="h-6 w-6" />
                </button>

                {/* Botão Voltar (Opcional) */}
                {showBackButton && (
                  <button
                    type="button"
                    onClick={() => router.push(backHref)}
                    className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 active:scale-95 transition-all"
                    aria-label="Voltar"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                )}

                {/* Título & Subtítulo */}
                {title && (
                  <div>
                    <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-none">
                      {title}
                    </h1>
                    {subtitle && (
                      <p className="text-xs text-slate-500 font-medium mt-1">
                        {subtitle}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Ações do Lado Direito */}
              {headerActions && (
                <div className="flex items-center gap-2">
                  {headerActions}
                </div>
              )}
            </header>
          )}

          {/* Conteúdo Principal */}
          <main className={`flex-1 ${className}`}>
            {children}
          </main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}

/**
 * Botão auxiliar das 3 Barrinhas para páginas com cabeçalhos personalizados (ex: Home)
 */
export function MobileMenuButton({ className = '' }: { className?: string }) {
  const { openMobileMenu } = useAppSidebar();
  return (
    <button
      type="button"
      onClick={openMobileMenu}
      className={`p-2 rounded-xl text-white/90 hover:text-white hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center ${className}`}
      aria-label="Abrir menu lateral"
    >
      <Menu className="h-6 w-6" />
    </button>
  );
}
