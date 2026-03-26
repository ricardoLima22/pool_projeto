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
      ? "text-destructive bg-destructive/10"
      : priority === "Média"
      ? "text-warning bg-warning/10"
      : "text-success bg-success/10";

  return (
    <div onClick={onClick} className="bg-card rounded-xl p-4 shadow-sm border border-border hover:shadow-md transition-shadow cursor-pointer group">
      <div className="flex items-start gap-3">
        <div className="bg-primary/10 rounded-full p-2.5 mt-0.5">
          <Wrench className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-card-foreground">{title}</p>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{client}</p>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{address}</span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
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

