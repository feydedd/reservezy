"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

/* ─── Easing ────────────────────────────────────────────────────────── */
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/* ─── Variant factories ─────────────────────────────────────────────── */
const fadeUp = (delay = 0, distance = 20) => ({
  hidden: { opacity: 0, y: distance },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, delay, ease: EASE_OUT } },
});

/* ─── Stagger containers ─────────────────────────────────────────────── */
const featureContainer = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const featureItem      = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  show:   { opacity: 1, y: 0,  scale: 1,   transition: { duration: 0.5, ease: EASE_OUT } },
};

const staggerList = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const staggerItem = {
  hidden: { opacity: 0, scale: 0.88, y: 8 },
  show:   { opacity: 1, scale: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } },
};

const testimonialContainer = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } };
const testimonialItem      = {
  hidden: { opacity: 0, y: 32 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
};

const faqContainer = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const faqItem      = {
  hidden: { opacity: 0, x: -18 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE_OUT } },
};

/* ═══════════════════════════════════════════════════════════════════════
 * Hero (entry animation only)
 * ═══════════════════════════════════════════════════════════════════════ */

export function MotionHeroBadge({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

export function MotionHeroTitle({ children }: { children: React.ReactNode }) {
  return (
    <motion.h1
      className="text-balance text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-[3.5rem] sm:leading-[1.05]"
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.08, ease: EASE_OUT }}
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
      transition={{ duration: 0.5, delay: 0.16, ease: EASE_OUT }}
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
      transition={{ duration: 0.45, delay: 0.24, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
 * Scroll-driven hero parallax (hero content drifts up as you scroll)
 * ═══════════════════════════════════════════════════════════════════════ */

export function MotionHeroParallax({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y       = useTransform(scrollYProgress, [0, 1], [0, -140]);
  const scale   = useTransform(scrollYProgress, [0, 1], [1, 0.94]);
  const opacity = useTransform(scrollYProgress, [0, 0.75], [1, 0]);

  return (
    <motion.div ref={ref} style={{ y, scale, opacity }} className="relative">
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
 * Ambient orbs (slow floaters in hero background)
 * ═══════════════════════════════════════════════════════════════════════ */
export function MotionAmbientOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <motion.div
        className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#8b86f9]/12 blur-[80px]"
        animate={{ x: [0, 18, 0], y: [0, -12, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-0 top-24 h-72 w-72 rounded-full bg-[#6d66f0]/10 blur-[70px]"
        animate={{ x: [0, -14, 0], y: [0, 20, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
      />
      <motion.div
        className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-[#38bdf8]/8 blur-[90px]"
        animate={{ x: [0, 10, 0], y: [0, -8, 0] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 3 }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
 * Generic scroll reveal & section heading
 * ═══════════════════════════════════════════════════════════════════════ */

export function MotionReveal({
  children, className, delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      variants={fadeUp(delay)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-32px" }}
    >
      {children}
    </motion.div>
  );
}

export function MotionSectionHeading({
  children, className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={fadeUp(0, 24)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
 * Parallax layer — moves at a different speed than the page
 * ═══════════════════════════════════════════════════════════════════════ */

export function MotionParallaxLayer({
  children, className, speed = 0.2,
}: {
  children: React.ReactNode;
  className?: string;
  /** -1..1, negative = moves up faster than scroll, positive = moves down */
  speed?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [speed * 120, -speed * 120]);
  return (
    <motion.div ref={ref} style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
 * Feature grid (stagger + lift on hover)
 * ═══════════════════════════════════════════════════════════════════════ */

export function MotionFeatureGrid({
  children, className,
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
  children, className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={featureItem}
      whileHover={{ y: -6, transition: { duration: 0.2, ease: EASE_OUT } }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
 * Industries — chips pop in
 * ═══════════════════════════════════════════════════════════════════════ */

export function MotionIndustriesGrid({
  children, className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={staggerList}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-32px" }}
    >
      {children}
    </motion.div>
  );
}

export function MotionIndustryChip({
  children, className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.span
      variants={staggerItem}
      whileHover={{ scale: 1.05, transition: { duration: 0.15 } }}
      className={className}
    >
      {children}
    </motion.span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
 * Testimonials — staggered drift with hover lift
 * ═══════════════════════════════════════════════════════════════════════ */

export function MotionTestimonialsGrid({
  children, className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={testimonialContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-40px" }}
    >
      {children}
    </motion.div>
  );
}

export function MotionTestimonialCard({
  children, className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.blockquote
      variants={testimonialItem}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={className}
    >
      {children}
    </motion.blockquote>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
 * FAQ — slide in from left
 * ═══════════════════════════════════════════════════════════════════════ */

export function MotionFAQList({
  children, className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.dl
      className={className}
      variants={faqContainer}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-32px" }}
    >
      {children}
    </motion.dl>
  );
}

export function MotionFAQItem({
  children, className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={faqItem} className={className}>
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
 * Pricing strip + bottom CTA
 * ═══════════════════════════════════════════════════════════════════════ */

export function MotionPricingStrip({
  children, className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={fadeUp(0, 18)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-32px" }}
    >
      {children}
    </motion.div>
  );
}

export function MotionBottomCTA({
  children, className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, scale: 0.97, y: 20 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.65, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}
