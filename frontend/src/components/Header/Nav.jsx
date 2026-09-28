import { useContext, useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Badge } from "@mui/material";
import { AuthContext } from "../../context/AuthContext";
import { RegistrosContext } from "../../context/RegistrosContext";
import "./style.css";

const NAV_SECTIONS = [
  {
    title: "General",
    items: [
      { to: "/", label: "Inicio", icon: "🏠", end: true },
      { to: "/list", label: "Registros", icon: "📋", badge: true },
      { to: "/new", label: "Nuevo registro", icon: "➕", cta: true },
    ],
  },
  {
    title: "Gestión",
    items: [
      { to: "/categorias", label: "Categorías", icon: "🏷️" },
      { to: "/inversiones", label: "Inversiones", icon: "📈" },
      { to: "/suscripciones", label: "Suscripciones", icon: "🔁" },
    ],
  },
  {
    title: "Asistente",
    items: [{ to: "/bot", label: "Agustín", icon: "✨" }],
  },
];

function Nav() {
  const { userInfo, logout } = useContext(AuthContext);
  const { numRegistros } = useContext(RegistrosContext);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navRef = useRef(null);

  // Cierra el drawer al navegar, para no dejarlo abierto tapando la página en móvil.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Bloquea el scroll del body mientras el drawer móvil está abierto.
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Cerrar con click fuera (además del backdrop) y con Escape.
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const close = () => setOpen(false);

  const handleLogout = () => {
    logout();
    close();
  };

  return (
    <>
      <div id="mobile-topbar">
        <button
          type="button"
          className="nav-toggle"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
        >
          {open ? "✕" : "☰"}
        </button>
        <NavLink to="/" className="brand-link" onClick={close}>
          CashFlow
        </NavLink>
      </div>

      {open && <div className="nav-backdrop" onClick={close} aria-hidden="true" />}

      <nav id="app-nav" ref={navRef} className={open ? "open" : ""}>
        <NavLink to="/" className="brand-link" onClick={close}>
          <span aria-hidden="true">💸</span> CashFlow
        </NavLink>

        <div className="nav-scroll">
          {NAV_SECTIONS.map((section) => (
            <div className="nav-section" key={section.title}>
              <span className="nav-section-title">{section.title}</span>
              <ul>
                {section.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={close}
                      className={({ isActive }) =>
                        `nav-item${item.cta ? " nav-item--cta" : ""}${
                          isActive ? " nav-item-active" : ""
                        }`
                      }
                    >
                      {item.badge ? (
                        <Badge
                          className="nav-icon-badge"
                          badgeContent={numRegistros}
                          color="secondary"
                          overlap="circular"
                        >
                          <span className="nav-icon" aria-hidden="true">
                            {item.icon}
                          </span>
                        </Badge>
                      ) : (
                        <span className="nav-icon" aria-hidden="true">
                          {item.icon}
                        </span>
                      )}
                      <span className="nav-label">{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="nav-footer">
          <div className="nav-user">
            <img id="img-user" src="profile.jpeg" alt="" />
            <span className="nav-username">@{userInfo.username}</span>
          </div>
          <button type="button" id="nav-logout" onClick={handleLogout}>
            <span aria-hidden="true">🚪</span> Cerrar sesión
          </button>
        </div>
      </nav>
    </>
  );
}

export default Nav;
