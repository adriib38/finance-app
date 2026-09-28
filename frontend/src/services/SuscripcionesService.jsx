import { API_BASE_URL } from "../env";

const parse = async (resp) => {
    const data = await resp.json().catch(() => null);
    if (!resp.ok) {
        const err = new Error((data && data.message) || "Error en suscripciones");
        err.status = resp.status;
        throw err;
    }
    return { status: resp.status, data };
};

export const getSuscripciones = async () => {
    return parse(await fetch(`${API_BASE_URL}/suscripciones`, { credentials: "include" }));
};

export const createSuscripcion = async (suscripcion) => {
    return parse(await fetch(`${API_BASE_URL}/suscripciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(suscripcion),
    }));
};

export const updateSuscripcion = async (id, fields) => {
    return parse(await fetch(`${API_BASE_URL}/suscripciones/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(fields),
    }));
};

export const deleteSuscripcion = async (id) => {
    return parse(await fetch(`${API_BASE_URL}/suscripciones/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    }));
};
