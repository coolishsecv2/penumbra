import { Outlet, NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Usb,
  Wrench,
  Settings,
  Zap,
  HardDrive,
  Shield,
  Cpu,
} from "lucide-react";

const navItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/flasher", icon: Zap, label: "Flasher" },
  { to: "/tools", icon: Wrench, label: "Tools" },
  { to: "/device-info", icon: HardDrive, label: "Device Info" },
  { to: "/advanced", icon: Cpu, label: "Advanced" },
  { to: "/security", icon: Shield, label: "Security" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

export function Layout() {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-56 border-r border-border bg-card">
        <div className="flex items-center gap-2 px-4 py-4 border-b border-border">
          <div className="flex size-8 items-center justify-center rounded-lg bg-accent">
            <Usb className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground">Penumbra</h1>
            <p className="text-[10px] text-muted">v1.2.0</p>
          </div>
        </div>
        <nav className="p-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? "bg-accent/10 text-accent"
                    : "text-muted hover:text-foreground hover:bg-card-hover"
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
