import { createContext, useContext, useCallback, useEffect, useState } from "react";
import { AuthContext } from "./AuthContext";
import {
  getSuscripciones as getSuscripcionesService,
  createSuscripcion as createSuscripcionService,
  updateSuscripcion as updateSuscripcionService,
  deleteSuscripcion as deleteSuscripcionService,
} from "../services/SuscripcionesService";

export const SuscripcionesContext = createContext();

export function SuscripcionesContextProvider(props) {
  const { isAuthenticated } = useContext(AuthContext);
  const [suscripciones, setSuscripciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const resp = await getSuscripcionesService();
      setSuscripciones(resp.data || []);
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

  const crear = async (suscripcion) => {
    const resp = await createSuscripcionService(suscripcion);
    await refresh();
    return resp.data;
  };

  const actualizar = async (id, fields) => {
    const resp = await updateSuscripcionService(id, fields);
    await refresh();
    return resp.data;
  };

  const eliminar = async (id) => {
    await deleteSuscripcionService(id);
    await refresh();
  };

  return (
    <SuscripcionesContext.Provider
      value={{
        suscripciones,
        loading,
        error,
        refresh,
        crear,
        actualizar,
        eliminar,
      }}
    >
      {props.children}
    </SuscripcionesContext.Provider>
  );
}
