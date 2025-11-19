"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const FloatingHearts = () => {
  const [hearts, setHearts] = useState<{ id: number; left: number; size: number; duration: number; delay: number }[]>([]);

  useEffect(() => {
    // 生成随机爱心数据
    const newHearts = Array.from({ length: 15 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100, // 随机水平位置 0-100%
      size: Math.random() * 20 + 10, // 随机大小 10-30px
      duration: Math.random() * 10 + 10, // 随机持续时间 10-20s
      delay: Math.random() * 5, // 随机延迟
    }));
    setHearts(newHearts);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {hearts.map((heart) => (
        <motion.div
          key={heart.id}
          initial={{ y: "110vh", opacity: 0 }}
          animate={{
            y: "-10vh",
            opacity: [0, 0.6, 0], // 淡入 -> 可见 -> 淡出
            x: [0, Math.random() * 50 - 25, 0], // 稍微左右摆动
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
