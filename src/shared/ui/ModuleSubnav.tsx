import { NavLink } from "react-router-dom";
import "./module-subnav.css";

export interface ModuleSubnavItem {
  to: string;
  label: string;
}

interface ModuleSubnavProps {
  items: ModuleSubnavItem[];
  label: string;
}

export function ModuleSubnav({ items, label }: ModuleSubnavProps) {
  return (
    <nav className="module-subnav" aria-label={label}>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => (isActive ? "active" : undefined)}
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
