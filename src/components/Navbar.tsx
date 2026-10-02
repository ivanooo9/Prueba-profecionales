"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getLocalUser, removeLocalToken, removeLocalUser } from "@/lib/api";
import { User, LogOut, LayoutDashboard, Menu, X, ShieldAlert } from "lucide-react";

export default function Navbar() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Cargar el usuario de localStorage al montar
    setCurrentUser(getLocalUser());

    const handleAuthChange = () => {
      setCurrentUser(getLocalUser());
    };

    window.addEventListener("auth-change", handleAuthChange);
    return () => {
      window.removeEventListener("auth-change", handleAuthChange);
    };
  }, []);

  const handleLogout = () => {
    removeLocalToken();
    removeLocalUser();
    setCurrentUser(null);
    window.dispatchEvent(new Event("auth-change"));
    router.push("/");
  };

  const getDashboardLink = () => {
    if (!currentUser) return "/";
    if (currentUser.role === "ADMIN") return "/dashboard/admin";
    if (currentUser.role === "PROFESSIONAL") return "/dashboard/profesional";
    return "/dashboard/cliente";
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-slate-900/80 border-b border-slate-800 text-slate-100 shadow-lg transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
                <span className="font-bold text-white text-lg">PE</span>
              </div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-blue-400 bg-clip-text text-transparent group-hover:opacity-90 transition-opacity">
                Profesionales<span className="text-blue-500 font-medium">.ec</span>
              </span>
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/directorio" className="text-sm font-medium text-slate-300 hover:text-white transition-colors duration-200">
              Directorio
            </Link>
            <Link href="/cursos" className="text-sm font-medium text-slate-300 hover:text-white transition-colors duration-200">
              Cursos
            </Link>
            <Link href="/conversatorios" className="text-sm font-medium text-slate-300 hover:text-white transition-colors duration-200">
              Conversatorios
            </Link>
            <Link href="/articulos" className="text-sm font-medium text-slate-300 hover:text-white transition-colors duration-200">
              Artículos
            </Link>
            <Link href="/convenios" className="text-sm font-medium text-slate-300 hover:text-white transition-colors duration-200">
              Convenios
            </Link>
          </div>

          {/* User Account Controls */}
          <div className="hidden md:flex items-center gap-4">
            {currentUser ? (
              <div className="flex items-center gap-4">
                <Link
                  href={getDashboardLink()}
                  className="flex items-center gap-2 text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2 px-4 rounded-lg shadow-md hover:shadow-indigo-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Mi Panel</span>
                </Link>
                <div className="flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
                  <div className="h-6 w-6 rounded-full bg-slate-700 flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-slate-300" />
                  </div>
                  <span className="text-xs font-semibold text-slate-200 max-w-[120px] truncate">
                    {currentUser.name}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center justify-center p-2 rounded-lg bg-slate-800 hover:bg-red-950/40 border border-slate-700 hover:border-red-900 text-slate-400 hover:text-red-400 transition-all duration-200"
                  title="Cerrar Sesión"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="text-sm font-medium text-slate-300 hover:text-white px-3 py-2 transition-colors"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  href="/login?tab=register"
                  className="text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg shadow-md hover:shadow-blue-500/25 transition-all duration-200"
                >
                  Registrarse
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-950 border-b border-slate-800 px-2 pt-2 pb-4 space-y-1">
          <Link
            href="/directorio"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:bg-slate-900 hover:text-white"
          >
            Directorio
          </Link>
          <Link
            href="/cursos"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:bg-slate-900 hover:text-white"
          >
            Cursos
          </Link>
          <Link
            href="/conversatorios"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:bg-slate-900 hover:text-white"
          >
            Conversatorios
          </Link>
          <Link
            href="/articulos"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:bg-slate-900 hover:text-white"
          >
            Artículos
          </Link>
          <Link
            href="/convenios"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:bg-slate-900 hover:text-white"
          >
            Convenios
          </Link>
          
          <div className="border-t border-slate-800 pt-4 mt-4 px-3 flex flex-col gap-3">
            {currentUser ? (
              <>
                <Link
                  href={getDashboardLink()}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-md"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Mi Panel</span>
                </Link>
                <div className="text-xs text-center text-slate-400 font-semibold py-1">
                  Usuario: {currentUser.name}
                </div>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-red-950/40 text-red-400 font-medium py-2 rounded-md border border-slate-800 hover:border-red-900"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Cerrar Sesión</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-center text-slate-300 hover:text-white py-2 font-medium"
                >
                  Iniciar Sesión
                </Link>
                <Link
                  href="/login?tab=register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block text-center bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-semibold"
                >
                  Registrarse
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
