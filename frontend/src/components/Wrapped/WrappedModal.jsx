import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { buildWrappedSlides } from "./wrappedSlides";
import "./Wrapped.css";

const GRADIENTS = [
  "linear-gradient(135deg, #771edf, #333bb8)",
  "linear-gradient(135deg, #16DB93, #048BA8)",
  "linear-gradient(135deg, #F29E4C, #E0274C)",
  "linear-gradient(135deg, #8E7DBE, #3D5A80)",
  "linear-gradient(135deg, #A4036F, #771edf)",
  "linear-gradient(135deg, #2E86AB, #16DB93)",
];

function WrappedModal({ data, onClose }) {
  const slides = useMemo(() => buildWrappedSlides(data), [data]);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const goTo = (next, dir) => {
    if (next < 0) return;
    if (next >= slides.length) {
      onClose();
      return;
    }
    setDirection(dir);
    setIndex(next);
  };

  const next = () => goTo(index + 1, 1);
  const prev = () => goTo(index - 1, -1);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  if (!slides.length) return null;
  const slide = slides[index];
  const background = GRADIENTS[index % GRADIENTS.length];

  return (
    <div className="wrapped-overlay" role="dialog" aria-modal="true" aria-label="Resumen del año">
      <div className="wrapped-progress">
        {slides.map((_, i) => (
          <span
            key={i}
            className={`wrapped-progress__bar${i <= index ? " is-filled" : ""}`}
          />
        ))}
      </div>

      <button type="button" className="wrapped-close" onClick={onClose} aria-label="Cerrar">
        ✕
      </button>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={index}
          className="wrapped-slide"
          style={{ background }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.25}
          onDragEnd={(_, info) => {
            if (info.offset.x < -70) next();
            else if (info.offset.x > 70) prev();
          }}
          onTap={(event, info) => {
            const half = window.innerWidth / 2;
            if (info.point.x < half) prev();
            else next();
          }}
          initial={{ x: direction > 0 ? 60 : -60, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: direction > 0 ? -60 : 60, opacity: 0 }}
          transition={{ duration: 0.32, ease: "easeOut" }}
        >
          <motion.span
            className="wrapped-slide__emoji"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 220 }}
          >
            {slide.emoji}
          </motion.span>
          <motion.h2
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
          >
            {slide.title}
          </motion.h2>
          <motion.p
            initial={{ y: 14, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {slide.body}
          </motion.p>
          {slide.big && (
            <motion.strong
              className="wrapped-slide__big"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.28, type: "spring", stiffness: 180 }}
            >
              {slide.big}
            </motion.strong>
          )}
          {slide.isLast && (
            <motion.button
              type="button"
              className="wrapped-slide__cta"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              Cerrar
            </motion.button>
          )}
          <span className="wrapped-slide__hint">‹ toca para navegar ›</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default WrappedModal;
