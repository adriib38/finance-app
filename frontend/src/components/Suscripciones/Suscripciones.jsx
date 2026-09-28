import { useContext, useState } from "react";
import {
  Alert,
  Button,
  Box,
  FormControlLabel,
  MenuItem,
  Snackbar,
  Switch,
  TextField,
} from "@mui/material";
import { SuscripcionesContext } from "../../context/SuscripcionesContext";
import { CategoriasContext } from "../../context/CategoriasContext";
import { formatFechaCorta } from "../../utils/dateRange";
import "./style.css";

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
};

function SuscripcionRow({ suscripcion }) {
  const { actualizar, eliminar } = useContext(SuscripcionesContext);
  const { byTipo } = useContext(CategoriasContext);
  const [nombre, setNombre] = useState(suscripcion.nombre);
  const [cantidad, setCantidad] = useState(suscripcion.cantidad);
  const [diaPago, setDiaPago] = useState(suscripcion.dia_pago);
  const [categoriaId, setCategoriaId] = useState(suscripcion.categoria_id || "");
  const [err, setErr] = useState(null);

  // includeInactive: si la categoría enlazada se ocultó después, que siga
  // saliendo seleccionada en vez de desaparecer del select.
  const categorias = byTipo(suscripcion.tipo, { includeInactive: true });

  const dirty =
    nombre.trim() !== suscripcion.nombre ||
    Number(cantidad) !== Number(suscripcion.cantidad) ||
    Number(diaPago) !== Number(suscripcion.dia_pago) ||
    (categoriaId || null) !== (suscripcion.categoria_id || null);

  const guardar = async () => {
    try {
      await actualizar(suscripcion.id, {
        nombre: nombre.trim(),
        cantidad: Number(cantidad),
        dia_pago: Number(diaPago),
        categoria_id: categoriaId || null,
      });
    } catch (e) {
      setErr(e.message);
    }
  };

  const togglePausada = async () => {
    try {
      await actualizar(suscripcion.id, { activa: !suscripcion.activa });
    } catch (e) {
      setErr(e.message);
    }
  };

  const borrar = async () => {
    if (
      !window.confirm(
        `¿Eliminar la suscripción "${suscripcion.nombre}"? Los cargos ya generados no se borran, solo se deja de facturar los próximos meses.`
      )
    )
      return;
    try {
      await eliminar(suscripcion.id);
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div className={`susc-card ${suscripcion.activa ? "" : "susc-card--inactive"}`}>
      <div className="susc-card-header">
        <span className={`susc-tipo susc-tipo--${suscripcion.tipo}`}>
          {suscripcion.tipo === "gasto" ? "Gasto" : "Ingreso"}
        </span>

        <TextField
          variant="standard"
          label="Nombre"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="susc-field susc-field--nombre"
        />

        <FormControlLabel
          className="susc-switch"
          control={<Switch checked={!!suscripcion.activa} onChange={togglePausada} />}
          label={suscripcion.activa ? "Activa" : "Pausada"}
        />

        <Button size="small" color="error" onClick={borrar}>
          Eliminar
        </Button>
      </div>

      <div className="susc-card-fields">
        <TextField
          variant="standard"
          select
          label="Categoría"
          value={categoriaId}
          onChange={(e) => setCategoriaId(e.target.value)}
          className="susc-field"
        >
          <MenuItem value="">Sin categoría</MenuItem>
          {categorias.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.nombre}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          variant="standard"
          type="number"
          label="Importe"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          className="susc-field"
          InputProps={{ endAdornment: "€" }}
        />

        <TextField
          variant="standard"
          type="number"
          label="Día de pago"
          value={diaPago}
          onChange={(e) => setDiaPago(e.target.value)}
          className="susc-field"
          inputProps={{ min: 1, max: 31 }}
        />

        <div className="susc-field susc-proximo">
          <span className="susc-field-label">Próximo cargo</span>
          <span className="susc-proximo-valor">
            {suscripcion.activa ? formatFechaCorta(suscripcion.proximoCargo) : "En pausa"}
          </span>
        </div>
      </div>

      <div className="susc-card-footer">
        <Button
          size="small"
          variant="contained"
          onClick={guardar}
          disabled={!dirty || !nombre.trim() || !cantidad || !diaPago}
        >
          Guardar cambios
        </Button>
      </div>

      <Snackbar open={!!err} autoHideDuration={4000} onClose={() => setErr(null)}>
        <Alert severity="error" variant="filled" onClose={() => setErr(null)}>
          {err}
        </Alert>
      </Snackbar>
    </div>
  );
}

const emptyForm = {
  tipo: "gasto",
  nombre: "",
  categoria_id: "",
  cantidad: "",
  dia_pago: "",
  fecha_inicio: hoyISO(),
};

function NuevaSuscripcion() {
  const { crear } = useContext(SuscripcionesContext);
  const { byTipo, loading: loadingCategorias } = useContext(CategoriasContext);
  const [form, setForm] = useState(emptyForm);
  const [err, setErr] = useState(null);

  const opcionesCategoria = byTipo(form.tipo);

  const set = (name) => (e) => {
    const value = e.target.value;
    setForm((prev) => {
      const next = { ...prev, [name]: value };
      if (name === "tipo") next.categoria_id = "";
      return next;
    });
  };

  const valido =
    form.nombre.trim() &&
    form.cantidad &&
    Number(form.cantidad) > 0 &&
    form.dia_pago &&
    Number(form.dia_pago) >= 1 &&
    Number(form.dia_pago) <= 31 &&
    form.fecha_inicio;

  const añadir = async () => {
    if (!valido) return;
    try {
      await crear({
        nombre: form.nombre.trim(),
        tipo: form.tipo,
        categoria_id: form.categoria_id || null,
        cantidad: Number(form.cantidad),
        dia_pago: Number(form.dia_pago),
        fecha_inicio: form.fecha_inicio,
      });
      setForm({ ...emptyForm, tipo: form.tipo });
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div className="susc-card susc-card--nueva">
      <div className="susc-card-header">
        <h2 className="susc-card-title">Nueva suscripción</h2>
      </div>

      <div className="susc-card-fields">
        <TextField
          variant="standard"
          select
          label="Tipo"
          value={form.tipo}
          onChange={set("tipo")}
          className="susc-field"
        >
          <MenuItem value="gasto">Gasto</MenuItem>
          <MenuItem value="ingreso">Ingreso</MenuItem>
        </TextField>

        <TextField
          variant="standard"
          label="Nombre"
          placeholder="Gimnasio"
          value={form.nombre}
          onChange={set("nombre")}
          className="susc-field"
        />

        <TextField
          variant="standard"
          select
          label="Categoría"
          value={form.categoria_id}
          onChange={set("categoria_id")}
          disabled={loadingCategorias}
          className="susc-field"
        >
          <MenuItem value="">Sin categoría</MenuItem>
          {opcionesCategoria.map((c) => (
            <MenuItem key={c.id} value={c.id}>
              {c.nombre}
            </MenuItem>
          ))}
        </TextField>

        <TextField
          variant="standard"
          type="number"
          label="Importe"
          value={form.cantidad}
          onChange={set("cantidad")}
          InputProps={{ endAdornment: "€" }}
          className="susc-field"
        />

        <TextField
          variant="standard"
          type="number"
          label="Día de pago"
          title="Día del mes en el que se cobra (1-31)"
          value={form.dia_pago}
          onChange={set("dia_pago")}
          inputProps={{ min: 1, max: 31 }}
          className="susc-field"
        />

        <TextField
          variant="standard"
          type="date"
          label="Empieza"
          InputLabelProps={{ shrink: true }}
          value={form.fecha_inicio}
          onChange={set("fecha_inicio")}
          className="susc-field"
        />
      </div>

      <div className="susc-card-footer">
        <Button variant="contained" onClick={añadir} disabled={!valido}>
          Añadir
        </Button>
      </div>

      <Snackbar open={!!err} autoHideDuration={4000} onClose={() => setErr(null)}>
        <Alert severity="error" variant="filled" onClose={() => setErr(null)}>
          {err}
        </Alert>
      </Snackbar>
    </div>
  );
}

function Suscripciones() {
  const { suscripciones, loading, error, refresh } = useContext(SuscripcionesContext);

  return (
    <div className="susc-page">
      <h1>Suscripciones</h1>
      <p className="susc-intro">
        Pagos o ingresos que se repiten cada mes (gimnasio, streaming, nómina…).
        El día indicado se crea solo el registro correspondiente; si el
        servidor estuvo parado ese día, se genera al volver a arrancar con la
        fecha real a la que tocaba.
      </p>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" size="small" onClick={refresh}>
              Reintentar
            </Button>
          }
        >
          No se pudieron cargar las suscripciones ({error}). ¿Has reiniciado el
          backend tras actualizar?
        </Alert>
      )}

      <NuevaSuscripcion />
      <h3>Mis suscripciones</h3>
      <Box className="susc-list">
        {loading && suscripciones.length === 0 ? (
          <p>Cargando…</p>
        ) : suscripciones.length === 0 ? (
          <p>No tienes ninguna suscripción todavía.</p>
        ) : (
          suscripciones.map((s) => <SuscripcionRow key={s.id} suscripcion={s} />)
        )}
      </Box>
    </div>
  );
}

export default Suscripciones;
