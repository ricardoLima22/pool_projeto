import { Users, MapPin, Phone, ChevronRight } from "lucide-react";

export const ClientCard = ({
  name,
  address,
  phone,
  onClick,
}: {
  name: string;
  address: string;
  phone: string;
  onClick?: () => void;
}) => (
  <div onClick={onClick} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer group">
    <div className="bg-blue-50 rounded-full p-2.5 border border-blue-100">
      <Users className="h-5 w-5 text-blue-500" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-slate-800">{name}</p>
      <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
        <MapPin className="h-3 w-3 text-slate-400" />
        <span className="truncate">{address}</span>
      </div>
    </div>
    <div className="flex items-center gap-2 shrink-0">
      <div className="flex items-center gap-1 text-xs text-slate-500">
        <Phone className="h-3 w-3 text-slate-400" />
        <span className="hidden sm:inline">{phone}</span>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-500 transition-colors" />
    </div>
  </div>
);
