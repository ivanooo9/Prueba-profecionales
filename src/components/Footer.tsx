import Link from "next/link";
import { Facebook, Instagram, Twitter, Linkedin, Heart } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-900 text-slate-400 py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Columna 1: Info General */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center">
                <span className="font-bold text-white text-md">PE</span>
              </div>
              <span className="font-bold text-lg text-white">
                Profesionales<span className="text-blue-500 font-normal">.ec</span>
              </span>
            </Link>
            <p className="text-xs text-slate-500 leading-relaxed">
              El directorio y plataforma SaaS de profesionales más grande de Ecuador y Latinoamérica. Agendamiento, educación continua y facturación electrónica autorizada por el SRI.
            </p>
          </div>

          {/* Columna 2: Enlaces Rápidos */}
          <div>
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-4">Plataforma</h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/directorio" className="hover:text-white transition-colors">Directorio Profesional</Link>
              </li>
              <li>
                <Link href="/cursos" className="hover:text-white transition-colors">Cursos Activos</Link>
              </li>
              <li>
                <Link href="/conversatorios" className="hover:text-white transition-colors">Conversatorios</Link>
              </li>
              <li>
                <Link href="/articulos" className="hover:text-white transition-colors">Artículos de Investigación</Link>
              </li>
            </ul>
          </div>

          {/* Columna 3: Legal y Soporte */}
          <div>
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-4">Soporte y Legal</h3>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/nosotros" className="hover:text-white transition-colors">Quiénes Somos</Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-white transition-colors">Preguntas Frecuentes</Link>
              </li>
              <li>
                <Link href="/terminos" className="hover:text-white transition-colors">Términos de Servicio</Link>
              </li>
              <li>
                <Link href="/privacidad" className="hover:text-white transition-colors">Política de Privacidad</Link>
              </li>
            </ul>
          </div>

          {/* Columna 4: Redes y Contacto */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-4">Contacto</h3>
            <p className="text-xs text-slate-500">
              Email: soporte@profesionales.com<br />
              Telf: +593 99 999 9999<br />
              Ecuador / Latinoamérica
            </p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white transition-colors"><Facebook className="h-4 w-4" /></a>
              <a href="#" className="hover:text-white transition-colors"><Instagram className="h-4 w-4" /></a>
              <a href="#" className="hover:text-white transition-colors"><Twitter className="h-4 w-4" /></a>
              <a href="#" className="hover:text-white transition-colors"><Linkedin className="h-4 w-4" /></a>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-900 mt-8 pt-8 flex flex-col md:flex-row items-center justify-between text-xs text-slate-600 gap-4">
          <p>© 2026 Profesionales Ecuador. Todos los derechos reservados.</p>
          <p className="flex items-center gap-1">
            Hecho con <Heart className="h-3 w-3 text-red-500 fill-red-500" /> en Ecuador
          </p>
        </div>
      </div>
    </footer>
  );
}
