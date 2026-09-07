import { RegistrosContext } from "../../context/RegistrosContext";
import { useContext, useState } from "react";
import { NavLink } from "react-router-dom";
import { Badge } from "@mui/material";
import { AuthContext } from "../../context/AuthContext";
import { MenuUser } from "../../components/Header/MenuUser";

function HeaderApp() {
  const { isAuthenticated } = useContext(AuthContext);
  const { numRegistros } = useContext(RegistrosContext);
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header id="header-navbar">
      <h1>
        <NavLink
          className={({ isActive }) => {
            return isActive ? "isActive" : "";
          }}
          to="/"
          onClick={closeMenu}
        >
          CashFlow
        </NavLink>
      </h1>

      <button
        type="button"
        className="nav-toggle"
        aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((prev) => !prev)}
      >
        {menuOpen ? "✕" : "☰"}
      </button>

      <ul className={`nav-right${menuOpen ? " open" : ""}`}>
        <li>
          {isAuthenticated && (
            <Badge badgeContent={numRegistros} color="secondary">
              <NavLink
                className={({ isActive }) => {
                  return isActive ? "isActive" : "";
                }}
                to="/list"
                onClick={closeMenu}
              >
                Registros
              </NavLink>
            </Badge>
          )}
        </li>
        <li>
          {isAuthenticated && (
            <NavLink
              id="nav-crear-registro"
              className={({ isActive }) => {
                return isActive ? "isActive" : "";
              }}
              to="/new"
              onClick={closeMenu}
            >
              Crear registro
            </NavLink>
          )}
        </li>
        <li>
          {isAuthenticated && (
            <NavLink
              id="nav-bot"
              className={({ isActive }) => {
                return isActive ? "isActive" : "";
              }}
              to="/bot"
              onClick={closeMenu}
            >
              ✨ Agustín
            </NavLink>
          )}
        </li>
        <li>{isAuthenticated && <MenuUser onNavigate={closeMenu} />}</li>
        <li>
          {!isAuthenticated && (
            <NavLink id="nav-login" to="/login" onClick={closeMenu}>
              Login
            </NavLink>
          )}
        </li>
      </ul>
    </header>
  );
}

export default HeaderApp;
