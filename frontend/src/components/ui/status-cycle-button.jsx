import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, useMemo } from "react";

export default function CycleStatusButton({
  statuses,
  cycleInterval = 2800,
  onClick,
  className,
  disabled,
  type = "button",
  children
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Stringify to prevent interval resets on re-renders when passing inline arrays
  const statusKey = JSON.stringify(statuses);

  useEffect(() => {
    if (!statuses || statuses.length <= 1) return;
    
    // Reset index if we switch to a shorter status list to prevent out-of-bounds
    setCurrentIndex(prev => (prev >= statuses.length ? 0 : prev));

    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % statuses.length);
    }, cycleInterval);

    return () => clearInterval(interval);
  }, [statusKey, cycleInterval, statuses.length]);

  return (
    <motion.button
      type={type}
      onClick={onClick}
      className={className}
      disabled={disabled}
      whileHover={!disabled ? { y: -2 } : {}}
      whileTap={!disabled ? { scale: 0.99 } : {}}
    >
      {children}
      <span className="auth-btn-content" style={{ display: "inline-flex", justifyContent: "center", alignItems: "center" }}>
        <AnimatePresence mode="wait">
          <motion.span
            key={`${statusKey}-${currentIndex}`}
            initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            style={{ display: "inline-block", willChange: "transform, opacity, filter" }}
          >
            {statuses[currentIndex]}
          </motion.span>
        </AnimatePresence>
      </span>
    </motion.button>
  );
}
