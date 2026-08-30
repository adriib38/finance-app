import { useContext, useEffect, useState, useCallback } from "react";
import { RegistrosContext } from "../../context/RegistrosContext";
import { CategoriasContext } from "../../context/CategoriasContext";
import { Link } from "react-router-dom";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import "./style.css";

const emptyForm = {
  concepto: "",
  categoria_id: "",
  tipo: "",
  cantidad: 0,
  observaciones: "",
};

function CrearRegistro() {
  const [open, setOpen] = useState(false);
  const { crearRegistro, feedback } = useContext(RegistrosContext);
  const { byTipo, loading: loadingCategorias } = useContext(CategoriasContext);

  const [buttonDisabled, setButtonbuttonDisabled] = useState(true);
  const [formState, setFormState] = useState(emptyForm);

  const opcionesCategoria = formState.tipo ? byTipo(formState.tipo) : [];

  const validForm = useCallback(() => {
    const { concepto, categoria_id, tipo, cantidad, observaciones } = formState;
    const valid =
      concepto && categoria_id && tipo && cantidad && cantidad > 0 && observaciones;
    setButtonbuttonDisabled(!valid);
  }, [formState]);

  useEffect(() => {
    validForm();
  }, [formState, validForm]);

  const handlerForm = (e) => {
    const { name, value } = e.target;
    setFormState((prev) => {
      const next = { ...prev, [name]: value };
      // Al cambiar de tipo, la categoría elegida puede dejar de ser válida.
      if (name === "tipo") next.categoria_id = "";
      return next;
    });
  };

  const handlerCrearRegistro = async (e) => {
    e.preventDefault();

    const nuevoRegistro = {
      concepto: formState.concepto,
      categoria_id: formState.categoria_id,
      tipo: formState.tipo,
      cantidad: formState.cantidad,
      observaciones: formState.observaciones,
    };

    const exito = await crearRegistro(nuevoRegistro);
    if (exito) {
      setFormState(emptyForm);
      setOpen(true);
    }
  };

  const handleClose = (event, reason) => {
    if (reason === "clickaway") return;
    setOpen(false);
  };

  return (
    <div>
      <Snackbar open={open} autoHideDuration={3000} onClose={handleClose}>
        <Alert onClose={handleClose} severity="success" variant="filled" sx={{ width: "100%" }}>
          {feedback.message}. <Link to="/list">Lista registros</Link>.
        </Alert>
      </Snackbar>

      <h1>Crear registro</h1>

      <form id="form-crear-registro" onSubmit={handlerCrearRegistro}>
        <div className="form-grup">
          <label htmlFor="concepto">Concepto</label>
          <input
            type="text"
            id="concepto"
            name="concepto"
            placeholder="Compra semanal"
            required
            onChange={handlerForm}
            value={formState.concepto}
          />

          <fieldset className="radio-group">
            <legend>Tipo de registro</legend>
            <div className="radio-option">
              <input
                type="radio"
                id="gasto"
                name="tipo"
                value="gasto"
                required
                onChange={handlerForm}
                checked={formState.tipo === "gasto"}
              />
              <label htmlFor="gasto">Gasto</label>
            </div>
            <div className="radio-option">
              <input
                type="radio"
                id="ingreso"
                name="tipo"
                value="ingreso"
                onChange={handlerForm}
                checked={formState.tipo === "ingreso"}
              />
              <label htmlFor="ingreso">Ingreso</label>
            </div>
          </fieldset>

          <label htmlFor="categoria_id">Categoría</label>
          <select
            id="categoria_id"
            name="categoria_id"
            required
            disabled={!formState.tipo}
            value={formState.categoria_id}
            onChange={handlerForm}
          >
            <option value="" disabled>
              {!formState.tipo
                ? "Elige primero el tipo"
                : opcionesCategoria.length === 0
                ? "No hay categorías de este tipo — créalas en Categorías"
                : "Selecciona una categoría"}
            </option>
            {opcionesCategoria.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          {formState.tipo && !loadingCategorias && opcionesCategoria.length === 0 && (
            <p className="hint">
              <Link to="/categorias">Gestionar categorías</Link>
            </p>
          )}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="cantidad">Cantidad</label>
              <input
                type="number"
                id="cantidad"
                name="cantidad"
                required
                onChange={handlerForm}
                value={formState.cantidad}
              />
            </div>
          </div>

          <label htmlFor="observaciones">Observaciones</label>
          <textarea
            name="observaciones"
            id="observaciones"
            placeholder="Compra semanal en Carrefour"
            required
            onChange={handlerForm}
            value={formState.observaciones}
          ></textarea>

          <button type="submit" disabled={buttonDisabled}>
            Crear
          </button>
        </div>
      </form>
    </div>
  );
}

export default CrearRegistro;
