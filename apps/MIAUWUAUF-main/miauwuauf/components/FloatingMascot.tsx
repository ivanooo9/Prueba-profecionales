"use client";

import { motion, useAnimation } from "framer-motion";
import Image from "next/image";
import { useState, useEffect } from "react";

export default function FloatingMascot() {
  const [position, setPosition] = useState({ top: "80%", left: "80%" });
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    const moveMascot = () => {
      const newTop = Math.floor(Math.random() * 80 + 10) + "%"; // 10% a 90%
      const newLeft = Math.floor(Math.random() * 80 + 10) + "%"; // 10% a 90%
      
      // Determinar si debe mirar a la izquierda o derecha basado en el movimiento
      const currentLeft = parseInt(position.left);
      const targetLeft = parseInt(newLeft);
      if (targetLeft < currentLeft) {
        setIsFlipped(true);
      } else {
        setIsFlipped(false);
      }

      setPosition({ top: newTop, left: newLeft });
    };

    const interval = setInterval(moveMascot, 5000); // Se mueve cada 5 segundos
    return () => clearInterval(interval);
  }, [position]);

  return (
    <motion.div
      className="fixed z-[100] cursor-pointer pointer-events-none"
      animate={{ 
        top: position.top, 
        left: position.left,
        rotate: [0, 5, -5, 0]
      }}
      transition={{
        top: { duration: 4, ease: "easeInOut" },
        left: { duration: 4, ease: "easeInOut" },
        rotate: { repeat: Infinity, duration: 2, ease: "easeInOut" }
      }}
      style={{ transform: "translate(-50%, -50%)" }}
    >
      <svg width="0" height="0" className="absolute">
        <filter id="remove-white">
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
          className="absolute -top-16 -left-16 bg-white border-[3px] border-black p-2 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none min-w-[120px] text-center"
        >
          <p className="text-[10px] font-black uppercase tracking-tighter italic">¿Qué hay por aquí? </p>
          <div className="absolute -bottom-2 right-4 w-4 h-4 bg-white border-r-[3px] border-b-[3px] border-black rotate-45"></div>
        </motion.div>

        <motion.div 
          className="overflow-hidden"
          animate={{ scaleX: isFlipped ? -1 : 1 }}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.8 }}
          style={{ filter: "url(#remove-white)" }}
        >
          <Image
            src="/logoperrito.png"
            alt="Mascota MIAUWUAUF"
            width={200}
            height={200}
            className="object-contain"
          />
        </motion.div>
      </div>
    </motion.div>
  );
}
