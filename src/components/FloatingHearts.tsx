"use client";
import { motion } from "framer-motion";
import { useMemo } from "react";

function rand01(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const FloatingHearts = () => {
  const hearts = useMemo(
    () =>
      Array.from({ length: 15 }).map((_, i) => ({
        id: i,
        left: rand01(i + 1) * 100, // 0-100%
        size: rand01(i + 2) * 20 + 10, // 10-30px
        duration: rand01(i + 3) * 10 + 10, // 10-20s
        delay: rand01(i + 4) * 5, // 0-5s
        drift: rand01(i + 5) * 50 - 25, // -25..25
      })),
    []
  );

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {hearts.map((heart) => (
        <motion.div
          key={heart.id}
          initial={{ y: "110vh", opacity: 0 }}
          animate={{
            y: "-10vh",
            opacity: [0, 0.6, 0], // 淡入 -> 可见 -> 淡出
            x: [0, heart.drift, 0], // 稍微左右摆动
          }}
          transition={{
            duration: heart.duration,
            repeat: Infinity,
            delay: heart.delay,
            ease: "linear",
          }}
          style={{
            position: "absolute",
            left: `${heart.left}%`,
            fontSize: `${heart.size}px`,
            color: "rgba(255, 182, 193, 0.4)", // 浅粉色
          }}
        >
          ❤️
        </motion.div>
      ))}
      {/* 添加一些柔和的光斑背景 */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-rose-200/30 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-200/30 rounded-full blur-[100px]" />
    </div>
  );
};

export default FloatingHearts;
