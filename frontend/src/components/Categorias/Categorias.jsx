import { useContext, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Select,
  Snackbar,
  Switch,
  Tab,
  Tabs,
  TextField,
} from "@mui/material";
import { CategoriasContext } from "../../context/CategoriasContext";
import "./style.css";

function CategoriaRow({ categoria, hermanas }) {
  const { actualizar, eliminar, fusionar } = useContext(CategoriasContext);
  const [nombre, setNombre] = useState(categoria.nombre);
  const [color, setColor] = useState(categoria.color || "#888888");
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeTarget, setMergeTarget] = useState("");
  const [err, setErr] = useState(null);

  const dirty = nombre.trim() !== categoria.nombre || color !== (categoria.color || "#888888");

  const guardar = async () => {
    try {
      await actualizar(categoria.id, { nombre: nombre.trim(), color });
    } catch (e) {
      setErr(e.message);
    }
  };

  const toggleActiva = async () => {
    try {
      await actualizar(categoria.id, { activa: !categoria.activa });
    } catch (e) {
      setErr(e.message);
    }
  };

  const borrar = async () => {
    if (!window.confirm(`¿Eliminar la categoría "${categoria.nombre}"? Los registros quedarán sin categoría asignada.`))
      return;
    try {
      await eliminar(categoria.id);
    } catch (e) {
      setErr(e.message);
    }
  };

  const confirmarMerge = async () => {
    try {
      await fusionar(mergeTarget, categoria.id);
      setMergeOpen(false);
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div className={`cat-row ${categoria.activa ? "" : "cat-row--inactive"}`}>
      <input
        type="color"
        className="cat-color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        title="Color en las gráficas"
      />
      <TextField
        size="small"
        variant="standard"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        className="cat-nombre"
      />
      <FormControlLabel
        control={<Switch size="small" checked={!!categoria.activa} onChange={toggleActiva} />}
        label={categoria.activa ? "Activa" : "Oculta"}
      />
      <div className="cat-actions">
        <Button size="small" onClick={guardar} disabled={!dirty || !nombre.trim()}>
          Guardar
        </Button>
        <Button
          size="small"
          onClick={() => setMergeOpen(true)}
          disabled={hermanas.length === 0}
        >
          Fusionar
        </Button>
        <Button size="small" color="error" onClick={borrar}>
          Eliminar
        </Button>
      </div>

      <Dialog open={mergeOpen} onClose={() => setMergeOpen(false)}>
        <DialogTitle>Fusionar «{categoria.nombre}»</DialogTitle>
        <DialogContent>
          <p style={{ maxWidth: 360 }}>
            Los registros de <b>{categoria.nombre}</b> se reasignan a la categoría
            elegida y <b>{categoria.nombre}</b> se elimina.
          </p>
          <Select
            fullWidth
            size="small"
            displayEmpty
            value={mergeTarget}
            onChange={(e) => setMergeTarget(e.target.value)}
          >
            <MenuItem value="" disabled>
              Fusionar en…
            </MenuItem>
            {hermanas.map((h) => (
              <MenuItem key={h.id} value={h.id}>
                {h.nombre}
              </MenuItem>
            ))}
          </Select>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMergeOpen(false)}>Cancelar</Button>
          <Button onClick={confirmarMerge} disabled={!mergeTarget} color="error">
            Fusionar
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!err} autoHideDuration={4000} onClose={() => setErr(null)}>
        <Alert severity="error" variant="filled" onClose={() => setErr(null)}>
          {err}
        </Alert>
      </Snackbar>
    </div>
  );
}

function NuevaCategoria({ tipo }) {
  const { crear } = useContext(CategoriasContext);
  const [nombre, setNombre] = useState("");
  const [err, setErr] = useState(null);

  const añadir = async () => {
    if (!nombre.trim()) return;
    try {
      await crear({ nombre: nombre.trim(), tipo });
      setNombre("");
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div className="cat-nueva">
      <TextField
        size="small"
        placeholder={`Nueva categoría de ${tipo}`}
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && añadir()}
      />
      <Button variant="contained" onClick={añadir} disabled={!nombre.trim()}>
        Añadir
      </Button>
      <Snackbar open={!!err} autoHideDuration={4000} onClose={() => setErr(null)}>
        <Alert severity="error" variant="filled" onClose={() => setErr(null)}>
          {err}
        </Alert>
      </Snackbar>
    </div>
  );
}

function Categorias() {
  const { categorias, loading, error, refresh } = useContext(CategoriasContext);
  const [tab, setTab] = useState("gasto");

  const delTipo = useMemo(
    () => categorias.filter((c) => c.tipo === tab),
    [categorias, tab]
  );

  return (
    <div className="cat-page">
      <h1>Categorías</h1>
      <p className="cat-intro">
        Normaliza aquí las categorías de tus registros. Renómbralas, asígnales un
        color para las gráficas, ocúltalas o fusiona duplicados.
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
          No se pudieron cargar las categorías ({error}). ¿Has reiniciado el
          backend tras actualizar?
        </Alert>
      )}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Gastos" value="gasto" />
        <Tab label="Ingresos" value="ingreso" />
      </Tabs>

      <NuevaCategoria tipo={tab} />

      <Box className="cat-list">
        {loading && delTipo.length === 0 ? (
          <p>Cargando…</p>
        ) : delTipo.length === 0 ? (
          <p>No hay categorías de este tipo todavía.</p>
        ) : (
          delTipo.map((c) => (
            <CategoriaRow
              key={c.id}
              categoria={c}
              hermanas={delTipo.filter((h) => h.id !== c.id)}
            />
          ))
        )}
      </Box>
    </div>
  );
}

export default Categorias;
