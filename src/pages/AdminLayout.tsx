import { useEffect, useState } from "react";
import {
  CalendarDays,
  Clapperboard,
  Film,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Ticket,
  X,
} from "lucide-react";
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { supabase } from "../lib/supabase";
import "./AdminLayout.css";

function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkAdmin = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (mounted) {
          navigate("/admin/login", { replace: true });
        }
        return;
      }

      const { data: adminStatus, error } =
        await supabase.rpc("is_admin");

      if (error || !adminStatus) {
        await supabase.auth.signOut();

        if (mounted) {
          navigate("/admin/login", { replace: true });
        }

        return;
      }

      if (mounted) {
        setIsAdmin(true);
        setIsCheckingAuth(false);
      }
    };

    checkAdmin();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin/login", { replace: true });
  };

  if (isCheckingAuth || !isAdmin) {
    return (
      <div className="admin-loading">
        <div className="admin-loading-inner">
          <img
            src="/cinetara-logo.png"
            alt="CINETARA"
            className="admin-loading-logo"
          />

          <div className="admin-loading-line" />

          <span>AUTHENTICATING ADMIN ACCESS</span>
        </div>
      </div>
    );
  }

  const navItems = [
    {
      label: "Dashboard",
      path: "/admin",
      icon: LayoutDashboard,
      end: true,
    },
    {
      label: "Rentals",
      path: "/admin/rentals",
      icon: CalendarDays,
    },
    {
      label: "Movies",
      path: "/admin/movies",
      icon: Film,
    },
    {
      label: "Screenings",
      path: "/admin/screenings",
      icon: Clapperboard,
    },
    {
      label: "Bookings",
      path: "/admin/bookings",
      icon: Ticket,
    },
    {
      label: "Settings",
      path: "/admin/settings",
      icon: Settings,
    },
  ];

  return (
    <div className="admin-shell">
      <aside
        className={
          mobileOpen
            ? "admin-sidebar admin-sidebar-open"
            : "admin-sidebar"
        }
      >
        <div className="admin-sidebar-top">
          <NavLink
            to="/admin"
            className="admin-brand"
            onClick={() => setMobileOpen(false)}
          >
            <img
              src="/cinetara-logo.png"
              alt="CINETARA"
            />

            <div className="admin-brand-copy">
              <strong>CINETARA</strong>
              <span>ADMINISTRATION</span>
            </div>
          </NavLink>

          <button
            className="admin-mobile-close"
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close admin navigation"
          >
            <X size={20} />
          </button>
        </div>

        <div className="admin-nav-label">
          COMMAND CENTER
        </div>

        <nav className="admin-nav">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                className={({ isActive }) =>
                  isActive
                    ? "admin-nav-link admin-nav-link-active"
                    : "admin-nav-link"
                }
              >
                <Icon size={18} strokeWidth={1.7} />

                <span>{item.label}</span>

                {item.label === "Rentals" && (
                  <span className="admin-nav-status">
                    LIVE
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="admin-sidebar-bottom">
          <div className="admin-system-status">
            <span className="admin-status-dot" />

            <div>
              <strong>System Online</strong>
              <span>Secure admin session</span>
            </div>
          </div>

          <button
            className="admin-sidebar-logout"
            type="button"
            onClick={handleLogout}
          >
            <LogOut size={17} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {mobileOpen && (
        <button
          className="admin-sidebar-backdrop"
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div className="admin-main">
        <header className="admin-topbar">
          <button
            className="admin-mobile-menu"
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open admin navigation"
          >
            <Menu size={21} />
          </button>

          <div className="admin-breadcrumb">
            <span>CINETARA</span>
            <i>/</i>
            <strong>
              {location.pathname === "/admin"
                ? "Dashboard"
                : location.pathname
                    .split("/")
                    .filter(Boolean)
                    .pop()
                    ?.replace(/^\w/, (letter) =>
                      letter.toUpperCase()
                    )}
            </strong>
          </div>

          <div className="admin-topbar-right">
            <div className="admin-live-indicator">
              <span />
              ADMIN
            </div>

            <button
              className="admin-topbar-logout"
              type="button"
              onClick={handleLogout}
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;