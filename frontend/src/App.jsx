import Inicio from "./components/Inicio";
import ListaRegistros from "./components/ListaRegistros/ListaRegistros";
import { Routes, Route, BrowserRouter } from "react-router-dom";
import "./App.css";
import "./index.css";
import CrearRegistro from "./components/CrearRegistro/CrearRegistro";
import Categorias from "./components/Categorias/Categorias";
import Inversiones from "./components/Inversiones/Inversiones";
import Suscripciones from "./components/Suscripciones/Suscripciones";
import Bot from "./components/Bot/Bot";
import { RegistrosContextProvider } from "./context/RegistrosContext";
import { CategoriasContextProvider } from "./context/CategoriasContext";
import { SuscripcionesContextProvider } from "./context/SuscripcionesContext";
import SigninForm from "./components/auth/SigninForm";
import HeaderApp from "./components/Header/HeaderApp";
import { AuthContextProvider, AuthContext } from "./context/AuthContext";
import ProtectedRoute from "./shared/ProtectedRoute";
import PublicRoute from "./shared/PublicRoute";
import { useContext } from "react";

function NotFound() {
  return <h1>404</h1>;
}

function Layout() {
  const { isAuthenticated } = useContext(AuthContext);

  return (
    <div className={`app-shell${isAuthenticated ? " app-shell--nav" : ""}`}>
      <HeaderApp />
      <div id="content">
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Inicio />
              </ProtectedRoute>
            }
          />
          <Route
            path="/list"
            element={
              <ProtectedRoute>
                <ListaRegistros />
              </ProtectedRoute>
            }
          />
          <Route
            path="/new"
            element={
              <ProtectedRoute>
                <CrearRegistro />
              </ProtectedRoute>
            }
          />
          <Route
            path="/categorias"
            element={
              <ProtectedRoute>
                <Categorias />
              </ProtectedRoute>
            }
          />
          <Route
            path="/inversiones"
            element={
              <ProtectedRoute>
                <Inversiones />
              </ProtectedRoute>
            }
          />
          <Route
            path="/suscripciones"
            element={
              <ProtectedRoute>
                <Suscripciones />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bot"
            element={
              <ProtectedRoute>
                <Bot />
              </ProtectedRoute>
            }
          />
          <Route
            path="/login"
            element={
              <PublicRoute>
                <SigninForm />
              </PublicRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthContextProvider>
        <CategoriasContextProvider>
          <SuscripcionesContextProvider>
            <RegistrosContextProvider>
              <Layout />
            </RegistrosContextProvider>
          </SuscripcionesContextProvider>
        </CategoriasContextProvider>
      </AuthContextProvider>
    </BrowserRouter>
  );
}

export default App;
