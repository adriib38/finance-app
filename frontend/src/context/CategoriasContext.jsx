import { createContext, useContext, useCallback, useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import {
  getCategorias as getCategoriasService,
  createCategoria as createCategoriaService,
  updateCategoria as updateCategoriaService,
  deleteCategoria as deleteCategoriaService,
  mergeCategoria as mergeCategoriaService,
} from "../services/CategoriasService";

export const CategoriasContext = createContext();

export function CategoriasContextProvider(props) {
  const { isAuthenticated } = useContext(AuthContext);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const resp = await getCategoriasService();
      setCategorias(resp.data || []);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) refresh();
  }, [isAuthenticated, refresh]);

  // Devuelve las categorías activas de un tipo, ordenadas.
  const byTipo = useCallback(
    (tipo, { includeInactive = false } = {}) =>
      categorias.filter(
        (c) => c.tipo === tipo && (includeInactive || c.activa)
      ),
    [categorias]
  );

  const findById = useCallback(
    (id) => categorias.find((c) => c.id === id) || null,
    [categorias]
  );

  const crear = async (categoria) => {
    const resp = await createCategoriaService(categoria);
    await refresh();
    return resp.data;
  };

  const actualizar = async (id, fields) => {
    const resp = await updateCategoriaService(id, fields);
    await refresh();
    return resp.data;
  };

  const eliminar = async (id) => {
    await deleteCategoriaService(id);
    await refresh();
  };

  const fusionar = async (targetId, sourceId) => {
    const resp = await mergeCategoriaService(targetId, sourceId);
    await refresh();
    return resp.data;
  };

  return (
    <CategoriasContext.Provider
      value={{
        categorias,
        loading,
        error,
        refresh,
        byTipo,
        findById,
        crear,
        actualizar,
        eliminar,
        fusionar,
      }}
    >
      {props.children}
    </CategoriasContext.Provider>
  );
}
