function RegisterTypeDot({ t }) {
  //let color = t.toLowerCase() === "ingreso" ? "#0ca535" : "#c00127";
  let color = "";
  switch (t.toLowerCase()) {
    case "ingreso":
      color = "#0ca535"; // Verdve
      break;
    case "gasto":
      color = "#c00127";  // Rojo
      break;
    case "balance":
      color = "#048BA8";  // Azul
      break;
    default:
      color = "#000000";  // Negro por defecto
  }

  const spanStyle = {
    display: "inline-block",
    backgroundColor: color,
    borderRadius: "50%",
    width: "10px",
    height: "10px",
    marginRight: "5px",
  };

  return <span style={spanStyle}></span>;
}

export default RegisterTypeDot;
