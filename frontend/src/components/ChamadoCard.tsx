import { Wrench, ChevronRight, MapPin, Clock } from "lucide-react";

export const ChamadoCard = ({
  title,
  client,
  address,
  priority,
  time,
  onClick,
}: {
  title: string;
  client: string;
  address: string;
  priority: string;
  time: string;
  onClick?: () => void;
}) => {
  const priorityColor =
    priority === "Alta"
      ? "text-red-500 bg-red-100/50"
      : priority === "Média"
      ? "text-amber-500 bg-amber-100/50"
      : "text-emerald-500 bg-emerald-100/50";

  return (
    <div onClick={onClick} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer group">
      <div className="flex items-start gap-3">
        <div className="bg-cyan-50 rounded-full p-2.5 mt-0.5 border border-cyan-100">
          <Wrench className="h-5 w-5 text-cyan-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-800">{title}</p>
            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-cyan-500 transition-colors" />
          </div>
          <p className="text-sm text-slate-500 mt-0.5">{client}</p>
          <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{address}</span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Clock className="h-3 w-3" />
              {time}
            </div>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${priorityColor}`}
            >
              {priority}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
