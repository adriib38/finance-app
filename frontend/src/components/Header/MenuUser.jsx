import { useState, useContext, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import useMediaQuery from "@mui/material/useMediaQuery";
import { AuthContext } from "../../context/AuthContext";

function EntidadLi({children, style, ...rest}) {
  const liStyle = {
    padding: "10px 15px",
  }

  const combinatedStyle = {...liStyle, ...style}
  return <li style={combinatedStyle}{...rest}>{children}</li>

}

export function MenuUser({ onNavigate }) {
  const { userInfo, logout, loading } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  // En el menú móvil el avatar queda pegado a la izquierda (panel vertical),
  // así que el desplegable debe anclarse a izquierda; en escritorio el
  // avatar está pegado a la derecha del header y se ancla a la derecha.
  const isMobileNav = useMediaQuery("(max-width:760px)");

  // Cerrar el menú al hacer clic fuera de él.
  useEffect(() => {
    if (!open) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Avatar genérico por defecto (silueta "mystery person" de Gravatar).
  const srcImage = "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&s=200";


  const imgProfileStyle = {
    borderRadius: "50%",
    width: 50,
    border: "1px solid blue",
    cursor: "pointer",
  };

  const ulStyle = {
    fontSize: ".8em",
    display: "flex",
    flexDirection: "column",
    position: "absolute",
    top: "calc(100% + 8px)",
    ...(isMobileNav ? { left: 0 } : { right: 0 }),
    maxWidth: "calc(100vw - 32px)",
    background: "#fff",
    border: "3px solid whitesmoke",
    borderRadius: 6,
    width: "max-content",
    zIndex: 10,
  }

  if (loading) {
    return <div>...</div>;
  }

  const handleClick = () => {
    setOpen((prev) => !prev);
  };

  const handleNavigate = () => {
    setOpen(false);
    if (onNavigate) onNavigate();
  };

  const handleLogout = () => {
    logout();
    if (onNavigate) onNavigate();
  };

  return (
    <div ref={menuRef} style={{ position: "relative", display: "inline-block" }}>
      <img
        id="img-user"
        onClick={handleClick} style={imgProfileStyle} src={srcImage}></img>
      {open && (
        <ul
          id="user-menu"
          style={ulStyle}
        >
          <EntidadLi>@{userInfo.username}</EntidadLi>
          <hr></hr>
          <EntidadLi style={{ cursor: "pointer" }}>
            <Link
              to="/categorias"
              onClick={handleNavigate}
            >
              Categorías
            </Link>
          </EntidadLi>
          <hr></hr>
          <EntidadLi style={{ color: "red", cursor: "pointer" }} onClick={handleLogout}>
              Logout
          </EntidadLi>
        </ul>
      )}
    </div>
  );
}
