import { useState, useContext, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

function EntidadLi({children, style, ...rest}) {
  const liStyle = {
    padding: "10px 15px",
  }

  const combinatedStyle = {...liStyle, ...style}
  return <li style={combinatedStyle}{...rest}>{children}</li>

}

export function MenuUser() {
  const { userInfo, logout, loading } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

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
    left: "92%",
    background: "#fff",
    border: "3px solid whitesmoke",
    borderRadius: 6,
    width: "max-content",
    minWidth: "8%",
    zIndex: 10,
  }

  if (loading) {
    return <div>...</div>;
  }

  const handleClick = () => {
    setOpen((prev) => !prev);
  };

  return (
    <div ref={menuRef}>
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
              onClick={() => setOpen(false)}
            >
              Categorías
            </Link>
          </EntidadLi>
          <hr></hr>
          <EntidadLi style={{ color: "red", cursor: "pointer" }} onClick={logout}>
              Logout
          </EntidadLi>
        </ul>
      )}
    </div>
  );
}
