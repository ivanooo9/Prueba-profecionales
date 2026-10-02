"use client";

import Image from "next/image"
import { motion } from "framer-motion"

interface MiauLoadingProps {
  text?: string
  fullScreen?: boolean
}

export function MiauLoading({ text = "Cargando...", fullScreen = true }: MiauLoadingProps) {
  const containerClasses = fullScreen
    ? "fixed inset-0 z-[9999] flex min-h-[100dvh] items-center justify-center bg-[#EDE986] px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    : "flex flex-col items-center justify-center bg-transparent py-12 max-md:py-16 sm:py-20"

  return (
    <div className={containerClasses} key="miau-loading-container">
      {/* Filtro de transparencia estándar de la web */}
      <svg width="0" height="0" className="absolute">
        <filter id="remove-white-clean">
          <feColorMatrix 
            type="matrix" 
            values="1 0 0 0 0  
                    0 1 0 0 0  
                    0 0 1 0 0  
                    -1 -1 -1 1 0" 
          />
        </filter>
      </svg>

      <div className="flex w-full max-w-full flex-col items-center gap-10 text-[#000000] sm:gap-12 max-[480px]:gap-6">
        <div className="relative flex w-full max-w-[min(100vw-2rem,30rem)] items-center justify-center px-1 max-md:min-h-[10.5rem] sm:min-h-44 sm:px-0 md:min-h-60">
          {/* Mascotas Animadas */}
          <div
            className="flex max-w-full origin-center items-center justify-center gap-2 max-md:scale-[0.95] max-[360px]:scale-[0.88] sm:gap-8 md:gap-10"
            style={{ filter: "url(#remove-white-clean)" }}
          >
            <motion.div
              animate={{
                y: [0, -20, 0],
                rotate: [-5, 5, -5],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Image
                src="/logogato.png"
                alt="Gato"
                width={240}
                height={240}
                className="h-32 w-32 object-contain sm:h-52 sm:w-52 md:h-60 md:w-60"
                priority
              />
            </motion.div>

            <motion.div
              animate={{
                y: [-20, 0, -20],
                rotate: [5, -5, 5],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Image
                src="/logoperrito.png"
                alt="Perrito"
                width={240}
                height={240}
                className="h-32 w-32 object-contain sm:h-52 sm:w-52 md:h-60 md:w-60"
                priority
              />
            </motion.div>
          </div>
        </div>

        <div className="flex w-full max-w-[min(100vw-2rem,42rem)] flex-col items-center gap-8 max-[480px]:gap-5 sm:gap-8">
          <motion.p
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
            className="max-w-full px-2 text-center text-2xl font-black uppercase leading-tight tracking-tighter text-balance sm:px-4 sm:text-4xl md:text-6xl"
          >
            {text}
          </motion.p>

          {/* Barra Neobrutalista */}
          <div className="relative h-7 w-full max-w-md overflow-hidden rounded-full border-4 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] max-md:max-w-[min(100%,20rem)] sm:h-8 sm:border-[6px] sm:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)]">
            <motion.div
              className="h-full border-r-4 border-black bg-[#E7BEF8] sm:border-r-[6px]"
              animate={{ width: ["0%", "100%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
