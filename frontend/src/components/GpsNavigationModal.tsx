'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { MapPin, Navigation, Copy, Check, ExternalLink, Share2 } from 'lucide-react';
import { toast } from 'sonner';

interface GpsNavigationModalProps {
  isOpen: boolean;
  onClose: () => void;
  address?: string;
  clientName?: string;
}

export default function GpsNavigationModal({
  isOpen,
  onClose,
  address,
  clientName,
}: GpsNavigationModalProps) {
  const [copied, setCopied] = useState(false);

  if (!address) return null;

  const encodedAddress = encodeURIComponent(address.trim());

  // Deep Links / Universal Links
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  const wazeUrl = `https://waze.com/ul?q=${encodedAddress}&navigate=yes`;
  const appleMapsUrl = `https://maps.apple.com/?q=${encodedAddress}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success('Endereço copiado para a área de transferência!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar o endereço.');
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: clientName ? `Endereço - ${clientName}` : 'Endereço',
          text: address,
          url: googleMapsUrl,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          handleCopy();
        }
      }
    } else {
      handleCopy();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-6 rounded-2xl bg-white shadow-xl border border-slate-100">
        <DialogHeader className="text-left space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-teal-50 flex items-center justify-center text-[#008080]">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-800">
                Iniciar Navegação GPS
              </DialogTitle>
              {clientName && (
                <p className="text-xs text-slate-500 font-medium truncate max-w-[260px]">
                  {clientName}
                </p>
              )}
            </div>
          </div>
          <DialogDescription className="sr-only">
            Escolha o aplicativo de mapas ou GPS para navegar até o endereço selecionado.
          </DialogDescription>
        </DialogHeader>

        {/* Card do Endereço */}
        <div className="mt-2 bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-start gap-3">
          <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-700 font-medium leading-relaxed break-words flex-1">
            {address}
          </p>
        </div>

        {/* Opções de GPS */}
        <div className="mt-4 space-y-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Escolha seu aplicativo
          </p>

          {/* Google Maps */}
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/80 hover:border-blue-300 hover:shadow-sm transition-all group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                    fill="#EA4335"
                  />
                  <circle cx="12" cy="9" r="2.5" fill="#FFFFFF" />
                </svg>
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                    Google Maps
                  </span>
                  <span className="text-[10px] font-semibold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                    Mais usado
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Rotas, trânsito e visualização de satélite
                </p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </a>

          {/* Waze */}
          <a
            href={wazeUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/80 hover:border-cyan-300 hover:shadow-sm transition-all group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M19.3 10.05C19.1 6.1 15.9 3 12 3C8.1 3 4.9 6.1 4.7 10.05C3.15 10.45 2 11.85 2 13.55C2 15.5 3.55 17.05 5.5 17.05H6.2C6.7 18.75 8.25 20 10.1 20C11.55 20 12.8 19.2 13.5 18H16.2C16.9 19.2 18.15 20 19.6 20C21.45 20 23 18.75 23.5 17.05C24.4 16.2 25 14.95 25 13.55C25 11.85 23.85 10.45 22.3 10.05"
                    fill="#33CCFF"
                    transform="scale(0.8) translate(3, 2)"
                  />
                  <circle cx="9" cy="11" r="1.5" fill="#333333" />
                  <circle cx="15" cy="11" r="1.5" fill="#333333" />
                  <path
                    d="M10 14.5C10.5 15.5 13.5 15.5 14 14.5"
                    stroke="#333333"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="text-left">
                <span className="text-sm font-bold text-slate-800 group-hover:text-cyan-600 transition-colors">
                  Waze
                </span>
                <p className="text-[11px] text-slate-500">
                  Alertas em tempo real, radares e desvios
                </p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-cyan-600 transition-colors" />
          </a>

          {/* Apple Maps */}
          <a
            href={appleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/80 hover:border-slate-300 hover:shadow-sm transition-all group active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"
                    fill="#334155"
                  />
                </svg>
              </div>
              <div className="text-left">
                <span className="text-sm font-bold text-slate-800 group-hover:text-slate-900 transition-colors">
                  Apple Maps
                </span>
                <p className="text-[11px] text-slate-500">
                  Nativo para dispositivos iPhone / iPad
                </p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
          </a>
        </div>

        {/* Ações Secundárias */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600">Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copiar Endereço</span>
              </>
            )}
          </button>

          {typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              type="button"
              onClick={handleShare}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
              title="Compartilhar"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Compartilhar</span>
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
