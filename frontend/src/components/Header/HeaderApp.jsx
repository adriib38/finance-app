import { useContext } from "react";
import { NavLink } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import Nav from "./Nav";
import "./style.css";

function HeaderApp() {
  const { isAuthenticated } = useContext(AuthContext);

  if (isAuthenticated) {
    return <Nav />;
  }

  return (
    <header id="guest-topbar">
      <NavLink to="/" className="brand-link">
        CashFlow
      </NavLink>
      <NavLink id="nav-login" to="/login">
        Login
      </NavLink>
    </header>
  );
}

export default HeaderApp;
