import { useEffect, useContext, useState, createContext } from "react";
import { getRegistros as getRegistrosService } from "../services/RegistrosService";
import { deleteRegistro as deleteRegistroService } from "../services/RegistrosService";
import { createRegistro as createRegistroService } from "../services/RegistrosService";
import { updateRegistro as updateRegistroService } from "../services/RegistrosService";
import { AuthContext } from "../context/AuthContext";

export const RegistrosContext = createContext();

export function RegistrosContextProvider(props) {
  const { isAuthenticated } = useContext(AuthContext);

  const [registros, setRegistros] = useState([]);
  const [feedback, setFeedback] = useState({ message: "", type: "", key: 0 });
  const [numRegistros, setNumRegistros] = useState(0);

  const getRegistros = async () => {
    try {
      const resp = await getRegistrosService();
      if (resp.status === 200) {
        setRegistros(resp.data);
        setNumRegistros(resp.data.length);
      }
    } catch (error) {
      setFeedback({
        message: `Error al obtener registros`,
        type: "error",
        key: Date.now(),
      });
      return false;
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      getRegistros();
    }
  }, [isAuthenticated]);

  const deleteRegistro = async (id, concepto) => {
    try {
      const resp = await deleteRegistroService(id);
      if (resp.status === 200) {
        setFeedback({
          message: `Eliminado correctamente ${concepto}`,
          type: "successful",
          key: Date.now(),
        });
        setRegistros((prevRegistros) =>
          prevRegistros.filter((registro) => registro.id !== id)
        );
        setNumRegistros((prevNum) => prevNum - 1);
        return true;
      }
    } catch (error) {
      setFeedback({
        message: `Error al eliminar ${concepto}`,
        type: "error",
        key: Date.now(),
      });
      return false;
    }
  };

  const crearRegistro = async (nuevoRegistro) => {
    try {
      const resp = await createRegistroService(nuevoRegistro);
      if (resp.status === 201) {
        setFeedback({
          message: `Registro creado`,
          type: "successful",
          key: Date.now(),
        });
        getRegistros();
        return true;
      }
    } catch (error) {
      console.error("Error en la solicitud ", error);
      setFeedback({
        message: `Error al crear`,
        type: "error",
        key: Date.now(),
      });
      return false;
    }
  };

  const updateRegistro = async (nuevoRegistro) => {
    try {
      const resp = await updateRegistroService(nuevoRegistro);
      if (resp.status === 200) {
        setFeedback({
          message: `Registro editado`,
          type: "successful",
          key: Date.now(),
        });
        getRegistros();
        return true;
      }
    } catch (error) {
      console.error("Error en la solicitud ", error);
      setFeedback({
        message: `Error al editar`,
        type: "error",
        key: Date.now(),
      });
      return false;
    }
  };

  return (
    <RegistrosContext.Provider
      value={{
        registros,
        deleteRegistro,
        crearRegistro,
        updateRegistro,
        numRegistros,
        feedback,
      }}
    >
      {props.children}
    </RegistrosContext.Provider>
  );
}
