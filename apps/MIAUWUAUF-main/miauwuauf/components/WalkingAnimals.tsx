"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useState, useEffect } from "react";

export default function WalkingAnimals() {
  const [showDog, setShowDog] = useState(true);
  const [showCat, setShowCat] = useState(false);

  // Ciclo de animación: Perro cruza -> Gato cruza -> Repetir
  useEffect(() => {
    const dogDuration = 18; // segundos que tarda en cruzar
    const catDuration = 15; // segundos que tarda en cruzar
    const delayBetween = 2; // pausa entre uno y otro

    const cycle = () => {
      // 1. Mostrar perro
      setShowDog(true);
      setShowCat(false);
      
      // 2. Después de que el perro cruce, mostrar gato
      setTimeout(() => {
        setShowDog(false);
        setShowCat(true);
      }, (dogDuration + delayBetween) * 1000);

      // 3. Reiniciar ciclo
      setTimeout(cycle, (dogDuration + catDuration + delayBetween * 2) * 1000);
    };

    const initialTimeout = setTimeout(cycle, 1000);
    return () => {
      clearTimeout(initialTimeout);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      <svg width="0" height="0" className="absolute">
        <filter id="remove-white-animals">
          <feColorMatrix 
            type="matrix" 
            values="1 0 0 0 0  
                    0 1 0 0 0  
                    0 0 1 0 0  
                    -1 -1 -1 1 0" 
          />
        </filter>
      </svg>

      {/* Perrito: Caminando pum pum */}
      {showDog && (
        <motion.div
          key="dog-walking"
          initial={{ x: "-20vw", bottom: "-60px" }}
          animate={{ 
            x: "120vw",
            y: [0, -20, 0, -20, 0], // Salto tipo caminata
          }}
          transition={{
            x: { duration: 18, ease: "linear" },
            y: { duration: 0.8, repeat: 22, ease: "easeInOut" }
          }}
          className="absolute"
        >
          <div className="relative inline-flex flex-col items-center">
            {/* Burbuja pegada al lomo (misma lógica que el gato) */}
            <div className="absolute bottom-full left-1/2 z-50 mb-[-18px] w-max -translate-x-1/2 rounded-2xl border-[3px] border-black bg-white px-4 py-1.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
               <p className="whitespace-nowrap text-[12px] font-black uppercase italic tracking-tighter text-black">
                 WUAUF WUAUF
               </p>
               <div className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b-[3px] border-r-[3px] border-black bg-white" />
            </div>

            <motion.div
              animate={{ rotate: [-5, 5, -5] }}
              transition={{ duration: 0.4, repeat: Infinity }}
              style={{ filter: "url(#remove-white-animals)" }}
            >
              <Image
                src="/logoperrito.png"
                alt="Perrito caminando"
                width={150}
                height={150}
                className="object-contain"
              />
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Gatito: Movimiento diferente (más ágil/saltarín) */}
      {showCat && (
        <motion.div
          key="cat-walking"
          initial={{ x: "-20vw", bottom: "-60px" }}
          animate={{ 
            x: "120vw",
            y: [0, -50, 0, -50, 0], // Saltos más altos
            rotate: [0, 10, -10, 0]
          }}
          transition={{
            x: { duration: 15, ease: "linear" },
            y: { duration: 1.2, repeat: 12, ease: "circOut" },
            rotate: { duration: 0.6, repeat: Infinity }
          }}
          className="absolute"
        >
          <div className="relative inline-flex flex-col items-center">
              <div className="absolute bottom-full left-1/2 z-50 mb-[-45px] w-max -translate-x-1/2 rounded-2xl border-[3px] border-black bg-white px-4 py-1.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
               <p className="whitespace-nowrap text-[12px] font-black uppercase italic tracking-tighter text-black">
                 MIAU MIAU
               </p>
               <div className="absolute -bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 border-b-[3px] border-r-[3px] border-black bg-white" />
            </div>

            <motion.div
              style={{ filter: "url(#remove-white-animals)" }}
            >
              <Image
                src="/logogato.png"
                alt="Gatito saltando"
                width={150}
                height={150}
                className="object-contain"
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
