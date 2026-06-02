import React from "react";
import { AnimatePresence, motion } from "framer-motion";

interface PageTransitionProps {
  routeKey: string;
  className?: string;
  children: React.ReactNode;
}

export const PageTransition: React.FC<PageTransitionProps> = ({ routeKey, children, className }) => (
  <AnimatePresence mode="popLayout" initial={false}>
    <motion.div
      key={routeKey}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      style={{ willChange: "opacity" }}
      className={className}
    >
      {children}
    </motion.div>
  </AnimatePresence>
);

export default PageTransition;
