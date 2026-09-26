import { API_BASE_URL } from "../env";

const parse = async (resp) => {
    const data = await resp.json().catch(() => null);
    if (!resp.ok) {
        const err = new Error((data && data.message) || "Error en inversiones");
        err.status = resp.status;
        throw err;
    }
    return { status: resp.status, data };
};

export const getInversiones = async () => {
    return parse(await fetch(`${API_BASE_URL}/inversiones`, { credentials: "include" }));
};

// { totalAportado, posiciones: [{ ticker, nombre, tipo, participaciones, importe, precioMedio }] }
export const getResumenInversiones = async () => {
    return parse(await fetch(`${API_BASE_URL}/inversiones/resumen`, { credentials: "include" }));
};

// Aportaciones mensuales ya agregadas en backend: [{ periodo, importe }]
export const getAportacionesMensuales = async () => {
    return parse(await fetch(`${API_BASE_URL}/inversiones/timeline`, { credentials: "include" }));
};

export const createInversion = async (inversion) => {
    return parse(await fetch(`${API_BASE_URL}/inversiones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(inversion),
    }));
};

export const updateInversion = async (id, fields) => {
    return parse(await fetch(`${API_BASE_URL}/inversiones/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(fields),
    }));
};

export const deleteInversion = async (id) => {
    return parse(await fetch(`${API_BASE_URL}/inversiones/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    }));
};
