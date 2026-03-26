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
  <div onClick={onClick} className="bg-card rounded-xl p-4 shadow-sm border border-border flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer group">
    <div className="bg-accent/10 rounded-full p-2.5">
      <Users className="h-5 w-5 text-accent" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-card-foreground">{name}</p>
      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
        <MapPin className="h-3 w-3" />
        <span className="truncate">{address}</span>
      </div>
    </div>
    <div className="flex items-center gap-2 shrink-0">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Phone className="h-3 w-3" />
        <span className="hidden sm:inline">{phone}</span>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
    </div>
  </div>
);

