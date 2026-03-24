import { motion } from "framer-motion";

export default function GridScanBackground() {
  return (
    <div className="grid-scan-bg" aria-hidden="true">
      <div className="grid-scan-grid" />
      <motion.div
        className="grid-scan-line grid-scan-line-primary"
        initial={{ y: "-26%" }}
        animate={{ y: "126%" }}
        transition={{ duration: 8.8, ease: "linear", repeat: Infinity }}
      />
      <motion.div
        className="grid-scan-line grid-scan-line-soft"
        initial={{ y: "-38%" }}
        animate={{ y: "138%" }}
        transition={{ duration: 12, ease: "linear", repeat: Infinity, delay: 1.6 }}
      />
      <motion.div
        className="grid-scan-line grid-scan-line-trace"
        initial={{ y: "-18%" }}
        animate={{ y: "118%" }}
        transition={{ duration: 8.8, ease: "linear", repeat: Infinity, delay: 0.08 }}
      />
      <div className="grid-scan-radial grid-scan-radial-left" />
      <div className="grid-scan-radial grid-scan-radial-right" />
      <div className="grid-scan-vignette" />
    </div>
  );
}
