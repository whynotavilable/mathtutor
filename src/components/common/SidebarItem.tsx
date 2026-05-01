import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";

const SidebarItem = ({
  icon: Icon,
  label,
  to,
  active,
  onClick,
  id,
  collapsed = false,
  badge,
}: {
  icon: any;
  label: string;
  to: string;
  active?: boolean;
  onClick?: () => void;
  id?: string;
  collapsed?: boolean;
  badge?: string;
}) => (
  <Link
    to={to}
    onClick={onClick}
    id={id}
    title={collapsed ? [label, badge].filter(Boolean).join(" - ") : undefined}
    className={cn(
      "flex items-center px-6 py-3 transition-all duration-200 group text-sm",
      collapsed ? "justify-center" : "gap-3",
      active
        ? "bg-white/10 text-white border-r-4 border-highlight"
        : "text-white/80 hover:bg-white/10 hover:text-white"
    )}
  >
    <Icon size={18} className={cn(active ? "text-white" : "text-white/80 group-hover:text-white")} />
    {!collapsed && (
      <span className="flex min-w-0 flex-1 items-center gap-2">
        <span className={cn("font-medium", active && "font-semibold")}>{label}</span>
        {badge && (
          <span className="rounded-full border border-white/10 bg-white/10 px-1.5 py-0.5 text-[9px] font-black leading-none text-white/55">
            {badge}
          </span>
        )}
      </span>
    )}
  </Link>
);

export default SidebarItem;
