"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useState, useEffect } from "react";

export default function FloatingCat() {
  const [position, setPosition] = useState({ top: "5%", left: "50%" });
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    const moveMascot = () => {
      // Se mueve solo en la parte superior (botones de arriba)
      const newTop = Math.floor(Math.random() * 15 + 2) + "%"; // 2% a 17% (zona de la navegación)
      const newLeft = Math.floor(Math.random() * 80 + 10) + "%"; // 10% a 90%
      
      const currentLeft = parseInt(position.left);
      const targetLeft = parseInt(newLeft);
      if (targetLeft < currentLeft) {
        setIsFlipped(true);
      } else {
        setIsFlipped(false);
      }

      setPosition({ top: newTop, left: newLeft });
    };

    const interval = setInterval(moveMascot, 6000); // Se mueve cada 6 segundos (un poco más lento que el perro)
    return () => clearInterval(interval);
  }, [position]);

  return (
    <motion.div
      className="fixed z-[100] cursor-pointer pointer-events-none"
      animate={{ 
        top: position.top, 
        left: position.left,
        rotate: [0, -5, 5, 0]
      }}
      transition={{
        top: { duration: 5, ease: "easeInOut" },
        left: { duration: 5, ease: "easeInOut" },
        rotate: { repeat: Infinity, duration: 3, ease: "easeInOut" }
      }}
      style={{ transform: "translate(-50%, -50%)" }}
    >
      <svg width="0" height="0" className="absolute">
        <filter id="remove-white-cat">
          <feColorMatrix 
            type="matrix" 
            values="1 0 0 0 0  
                    0 1 0 0 0  
                    0 0 1 0 0  
                    -1 -1 -1 1 0" 
          />
        </filter>
      </svg>

      <div className="relative group pointer-events-auto">
        {/* Burbuja de pensamiento */}
        <motion.div 
          className="absolute -bottom-16 -left-16 bg-white border-[3px] border-black p-2 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none min-w-[120px] text-center"
        >
          <p className="text-[10px] font-black uppercase tracking-tighter italic">¿Por dónde andan todos? </p>
          <div className="absolute -top-2 right-4 w-4 h-4 bg-white border-l-[3px] border-t-[3px] border-black rotate-45"></div>
        </motion.div>

        <motion.div 
          className="overflow-hidden"
          animate={{ scaleX: isFlipped ? -1 : 1 }}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.8 }}
          style={{ filter: "url(#remove-white-cat)" }}
        >
          <Image
            src="/logogato.png"
            alt="Mascota Gato MIAUWUAUF"
            width={200}
            height={200}
            className="object-contain"
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
