import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";

const SidebarItem = ({
  icon: Icon,
  label,
  to,
  active,
  onClick,
  id,
}: {
  icon: any;
  label: string;
  to: string;
  active?: boolean;
  onClick?: () => void;
  id?: string;
}) => (
  <Link
    to={to}
    onClick={onClick}
    id={id}
    className={cn(
      "flex items-center gap-3 px-6 py-3 transition-all duration-200 group text-sm",
      active
        ? "bg-white/10 text-white border-r-4 border-highlight"
        : "text-white/80 hover:bg-white/10 hover:text-white"
    )}
  >
    <Icon size={18} className={cn(active ? "text-white" : "text-white/80 group-hover:text-white")} />
    <span className={cn("font-medium", active && "font-semibold")}>{label}</span>
  </Link>
);

export default SidebarItem;
