import { Wrench, ChevronRight, MapPin, Clock, Navigation } from "lucide-react";

export const ChamadoCard = ({
  title,
  client,
  address,
  time,
  status,
  onClick,
  onGpsClick,
}: {
  title: string;
  client: string;
  address: string;
  time?: string;
  status?: string;
  onClick?: () => void;
  onGpsClick?: (e: React.MouseEvent) => void;
}) => {
  const isCompleted = ["concluido", "concluído", "confirmada", "em_execucao"].includes(status?.toLowerCase() || "");
  return (
    <div onClick={onClick} className="bg-card rounded-xl p-4 shadow-sm border border-border hover:shadow-md transition-shadow cursor-pointer group flex items-center gap-3">
      <div className="bg-primary/10 rounded-full p-2.5 shrink-0">
        <Wrench className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-card-foreground truncate">{title}</p>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        </div>
        <p className="text-sm text-muted-foreground mt-0.5 truncate">{client}</p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{address}</span>
          {onGpsClick && address && address !== 'Sem endereço' && address !== 'Endereço não informado' && address !== 'Endereço não cadastrado' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onGpsClick(e);
              }}
              className="shrink-0 text-[10px] text-[#008080] bg-teal-50 hover:bg-teal-100 px-1.5 py-0.5 rounded border border-teal-200/60 font-semibold flex items-center gap-0.5 ml-1 transition-colors"
              title="Abrir GPS"
            >
              <Navigation className="h-2.5 w-2.5" />
              GPS
            </button>
          )}
        </div>
        {time && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1.5">
            <Clock className="h-3 w-3 shrink-0" />
            {time}
          </div>
        )}
      </div>
      {status && (
        <div className="shrink-0 text-right">
          <span className={`text-[11px] font-bold ${isCompleted ? "text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100" : "text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-100"}`}>
            {isCompleted ? 'Concluído' : 'Pendente'}
          </span>
        </div>
      )}
    </div>
  );
};

