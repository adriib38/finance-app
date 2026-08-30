import { useState, useContext, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Chip,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import Button from "@mui/material/Button";
import { DataGrid, GridToolbarContainer, GridToolbarExport } from '@mui/x-data-grid';
import { RegistrosContext } from "../../context/RegistrosContext";
import { CategoriasContext } from "../../context/CategoriasContext";
import { validateRow } from "../../shared/ValidateRows";
import Tooltip from "@mui/material/Tooltip";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import "./style.css";

function ListaRegistros() {
  const [modeEdit, setModeEdit] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [open, setOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const { registros, deleteRegistro, updateRegistro } = useContext(RegistrosContext);
  const { categorias, byTipo } = useContext(CategoriasContext);

  // --- Filtros de la vista ---
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [categoriaFilter, setCategoriaFilter] = useState([]); // ids de categoría

  useEffect(() => {
    setLoadingData(registros.length === 0);
  }, [registros]);

  const chipCategorias = useMemo(() => {
    const list =
      tipoFilter === "todos"
        ? categorias
        : categorias.filter((c) => c.tipo === tipoFilter);
    return [...list].sort(
      (a, b) => a.tipo.localeCompare(b.tipo) || a.orden - b.orden
    );
  }, [categorias, tipoFilter]);

  const filteredRegistros = useMemo(() => {
    const q = search.trim().toLowerCase();
    return registros.filter((r) => {
      if (tipoFilter !== "todos" && r.tipo !== tipoFilter) return false;
      if (q && !(r.concepto || "").toLowerCase().includes(q)) return false;
      if (categoriaFilter.length) {
        const ok = categoriaFilter.some((id) => {
          if (r.categoria_id === id) return true;
          const c = categorias.find((x) => x.id === id);
          return c && r.categoria === c.nombre;
        });
        if (!ok) return false;
      }
      return true;
    });
  }, [registros, search, tipoFilter, categoriaFilter, categorias]);

  const handleTipoFilter = (_e, val) => {
    setTipoFilter(val ?? "todos");
    setCategoriaFilter([]);
  };

  const toggleCategoria = (id) =>
    setCategoriaFilter((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const filtrosActivos =
    search.trim() !== "" || tipoFilter !== "todos" || categoriaFilter.length > 0;

  const limpiarFiltros = () => {
    setSearch("");
    setTipoFilter("todos");
    setCategoriaFilter([]);
  };

  const processRowUpdate = async (newRow) => {
    const errors = validateRow(newRow);
    if (errors.length > 0) {
      throw new Error(errors);
    }

    const row = { ...newRow };

    // Reasignar el enlace a la categoría maestra según el nombre elegido.
    const match = categorias.find(
      (c) => c.tipo === row.tipo && c.nombre === row.categoria
    );
    row.categoria_id = match ? match.id : null;

    await updateRegistro(row);
    return { ...row, id: newRow.id };
  };

  const handleProcessRowUpdateError = (error) => {
    const errors = error.message.split(", ");
    setValidationErrors(errors);
    setOpen(true);
  };

  const handleClose = (event, reason) => {
    console.log("reason", reason);
    //No cerrar Snack cuando se hace clic fuera del Snack
    if (reason === "clickaway") {
      return;
    }

    setOpen(false);
  };

  const handleModeEdit = () => {
    setModeEdit(!modeEdit);
  };

  const RegisterType = ({ t }) => {
    // Asignar color basado en el tipo
    let background = t === 'gasto' ? '#ce1c1cb0' : '#25ce257a';
    let text = t === 'gasto' ? 'rgb(112, 4, 4)' : 'rgb(8, 129, 8)';

    return (
      <span style={{ background: background, color: text, fontWeight:500, borderRadius: "10px", padding: "3px 6px" }}>
        {t}
      </span>
    );
  };

  const columns = [
    { field: "id", headerName: "Id", flex: 1, minWidth: 15},
    {
      field: "concepto",
      headerName: "Concepto",
      flex: 1,
      minWidth: 170,
      editable: modeEdit,
    },
    {
      field: "categoria",
      headerName: "Categoría",
      flex: 1,
      minWidth: 170,
      editable: modeEdit,
      type: "singleSelect",
      valueOptions: ({ row }) => {
        const tipo = row?.tipo;
        const opts = tipo
          ? byTipo(tipo, { includeInactive: true }).map((c) => c.nombre)
          : categorias.map((c) => c.nombre);
        // Permite conservar un valor de texto libre heredado que aún no esté
        // en la maestra.
        if (row?.categoria && !opts.includes(row.categoria)) opts.push(row.categoria);
        return opts;
      },
    },
    {
      field: "tipo",
      headerName: "Tipo",
      flex: 1,
      minWidth: 100,
      renderCell: (params) => {
        return (
          <span>
            <RegisterType t={params.value} />
          </span>
        );
      },
      editable: true,
    },
    {
      field: "cantidad",
      headerName: "Cantidad",
      flex: 1,
      minWidth: 100,
      editable: modeEdit,
    },
    {
      field: "observaciones",
      headerName: "Observaciones",
      flex: 1,
      minWidth: 180,
      editable: modeEdit,
    },
    {
      field: "created_at",
      headerName: "Creación",
      flex: 1,
      minWidth: 150,
      type: "dateTime",
      valueGetter: (value) => (value ? new Date(value) : null),
      renderCell: (params) =>
        params.value ? params.value.toLocaleString() : "",
    },
    {
      field: "updated_at",
      headerName: "Actualización",
      flex: 1,
      minWidth: 150,
      type: "dateTime",
      valueGetter: (value) => (value ? new Date(value) : null),
      renderCell: (params) => {
        if (!params.value) return "";
        const changed =
          params.row.created_at &&
          new Date(params.row.updated_at).getTime() -
            new Date(params.row.created_at).getTime() >
            1000;
        return (
          <span style={{ color: changed ? "#048BA8" : "#999" }}>
            {params.value.toLocaleString()}
          </span>
        );
      },
    },
    {
      field: "action",
      headerName: "Action",
      sortable: false,
      renderCell: (params) => {
        const onClick = (e) => {
          e.stopPropagation();
          if (window.confirm(`¿Eliminar ${params.row.id}?`)) {
            deleteRegistro(params.row.id);
          }
        };
        return (
          <Tooltip title="Delete" placement="right">
            <Button color="error" onClick={onClick}>
              X
            </Button>
          </Tooltip>
        );
      },
    },
  ];

  function CustomToolbar() {
    return (
      <GridToolbarContainer>
        <GridToolbarExport />
      </GridToolbarContainer>
    );
  }

  if (registros.length === 0 && !loadingData) {
    return (
      <h2>
        No hay registros. <Link to="/new">Crear ahora</Link>
      </h2>
    );
  }

  return (
    <Box style={{ background: "white" }}>
      <Snackbar open={open} autoHideDuration={3000} onClose={handleClose}>
        <Alert
          onClose={handleClose}
          severity="error"
          variant="filled"
          sx={{ width: "100%" }}
        >
          {validationErrors}
        </Alert>
      </Snackbar>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h2>
          {filtrosActivos
            ? `${filteredRegistros.length} de ${registros.length} registros`
            : `${registros.length} registros.`}
        </h2>
        <div style={{ display: "flex", gap: "30px" }}>
          <Tooltip
            title="Edit mode, dos clic en una celda para editar."
            placement="top"
          >
            <Button
              id="btn-mode-edit"
              className={modeEdit ? "active" : "inactive"}
              onClick={handleModeEdit}
              variant="outlined"
            >
              Edit
            </Button>
          </Tooltip>
        </div>
      </div>

      <div className="lista-filtros">
        <div className="lista-filtros-row">
          <TextField
            size="small"
            label="Buscar concepto"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 240 }}
          />
          <ToggleButtonGroup
            size="small"
            exclusive
            value={tipoFilter}
            onChange={handleTipoFilter}
          >
            <ToggleButton value="todos">Todos</ToggleButton>
            <ToggleButton value="gasto">Gastos</ToggleButton>
            <ToggleButton value="ingreso">Ingresos</ToggleButton>
          </ToggleButtonGroup>
          {filtrosActivos && (
            <Button size="small" onClick={limpiarFiltros}>
              Limpiar filtros
            </Button>
          )}
        </div>

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mt: 1.5 }}>
          {chipCategorias.map((c) => {
            const selected = categoriaFilter.includes(c.id);
            return (
              <Chip
                key={c.id}
                label={c.nombre}
                size="small"
                variant={selected ? "filled" : "outlined"}
                onClick={() => toggleCategoria(c.id)}
                sx={{
                  borderColor: c.color || undefined,
                  bgcolor: selected ? c.color || undefined : "transparent",
                  color: selected ? "#fff" : "inherit",
                  fontWeight: selected ? 600 : 400,
                }}
              />
            );
          })}
        </Stack>
      </div>

      <DataGrid
        loading={loadingData}
        autoHeight
        slots={{
          toolbar: CustomToolbar,
        }}
        rows={filteredRegistros}
        columns={columns}
        localeText={{
          columnsPanelTextFieldPlaceholder: "Custom Column Title",
        }}
        initialState={{
          pagination: {
            paginationModel: { page: 0, pageSize: 15 },
          },
          sorting: {
            sortModel: [{ field: "created_at", sort: "desc" }],
          }
        }}
        pageSizeOptions={[5, 10]}
        checkboxSelection
        sx={{
          backgroundColor: "white",
        }}
        processRowUpdate={processRowUpdate}
        onProcessRowUpdateError={handleProcessRowUpdateError}
      />
    </Box>
  );
}

export default ListaRegistros;
