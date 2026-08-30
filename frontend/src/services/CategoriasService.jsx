import { API_BASE_URL } from "../env";

const parse = async (resp) => {
    const data = await resp.json().catch(() => null);
    if (!resp.ok) {
        const err = new Error((data && data.message) || "Error en categorías");
        err.status = resp.status;
        throw err;
    }
    return { status: resp.status, data };
};

export const getCategorias = async (tipo) => {
    const qs = tipo ? `?tipo=${encodeURIComponent(tipo)}` : "";
    return parse(await fetch(`${API_BASE_URL}/categorias${qs}`, { credentials: "include" }));
};

export const createCategoria = async (categoria) => {
    return parse(await fetch(`${API_BASE_URL}/categorias`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(categoria),
    }));
};

export const updateCategoria = async (id, fields) => {
    return parse(await fetch(`${API_BASE_URL}/categorias/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(fields),
    }));
};

export const deleteCategoria = async (id) => {
    return parse(await fetch(`${API_BASE_URL}/categorias/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
    }));
};

export const mergeCategoria = async (targetId, sourceId) => {
    return parse(await fetch(`${API_BASE_URL}/categorias/${targetId}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sourceId }),
    }));
};
