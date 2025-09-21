"use client";
import { motion, useInView } from "framer-motion";
import React, { useRef } from "react";
import { cn } from "../../lib/utils";

interface TimelineContentProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  as?: React.ElementType;
  customVariants?: any;
}

export const TimelineContent: React.FC<TimelineContentProps> = ({
  children,
  className,
  as: Element = "div",
  customVariants,
  ...props
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  const defaultVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeInOut" } },
  };

  const variants = customVariants || defaultVariants;

  return (
    <Element ref={ref} className={cn(className)} {...props}>
      <motion.div
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={variants}
      >
        {children}
      </motion.div>
    </Element>
  );
};
