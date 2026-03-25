"use client";

import { motion } from "framer-motion";

const PoolBackground = () => {
  return (
    <div className="absolute inset-0 bg-[#081017] overflow-hidden -z-10 pointer-events-none">
      {/* Subtle animated caustic circles */}
      <motion.div
        className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-[0.07]"
        style={{ background: "radial-gradient(circle, hsl(190 90% 45%) 0%, transparent 70%)" }}
        animate={{ scale: [1, 1.2, 1], x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[-30%] left-[-15%] w-[700px] h-[700px] rounded-full opacity-[0.05]"
        style={{ background: "radial-gradient(circle, hsl(190 90% 45%) 0%, transparent 70%)" }}
        animate={{ scale: [1, 1.15, 1], x: [0, -20, 0], y: [0, 25, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-[40%] left-[60%] w-[400px] h-[400px] rounded-full opacity-[0.04]"
        style={{ background: "radial-gradient(circle, hsl(160 80% 50%) 0%, transparent 70%)" }}
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
};

export default PoolBackground;
