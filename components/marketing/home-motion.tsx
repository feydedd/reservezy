"use client";

import { motion } from "framer-motion";

const featureContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

const featureItem = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export function MotionHeroBadge({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function MotionHeroTitle({ children }: { children: React.ReactNode }) {
  return (
    <motion.h1
      className="text-balance text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-[3.25rem] sm:leading-[1.1]"
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.h1>
  );
}

export function MotionHeroSub({ children }: { children: React.ReactNode }) {
  return (
    <motion.p
      className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-rz-muted sm:text-lg"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.p>
  );
}

export function MotionHeroCtas({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="mt-10 flex flex-wrap items-center justify-center gap-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function MotionFeatureGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={featureContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-48px" }}
    >
      {children}
    </motion.div>
  );
}

export function MotionFeatureCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={featureItem} className={className}>
      {children}
    </motion.div>
  );
}

export function MotionMockWindow({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
      className="rz-mock-window relative mx-auto max-w-4xl overflow-hidden rounded-2xl border border-white/[0.1] bg-gradient-to-b from-[#14143a] to-[#0c0c22] p-1"
      style={{ transform: "perspective(1200px) rotateX(5deg) rotateY(-3deg)" }}
    >
      {children}
    </motion.div>
  );
}
