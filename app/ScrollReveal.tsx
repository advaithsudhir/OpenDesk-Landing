"use client";

import { useEffect } from "react";

export default function ScrollReveal() {
  useEffect(() => {
    const timer = setTimeout(() => {
      const els = Array.from(
        document.querySelectorAll<HTMLElement>("[data-reveal]")
      );
      if (!els.length || typeof IntersectionObserver === "undefined") return;

      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const target = entry.target as HTMLElement;
              target.style.opacity = "1";
              target.style.transform = "translateY(0)";
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.05 }
      );

      els.forEach((el) => {
        const r = el.getBoundingClientRect();
        const inView = r.top < window.innerHeight && r.bottom > 0;
        if (!inView) {
          el.style.opacity = "0";
          el.style.transform = "translateY(18px)";
        }
        io.observe(el);
      });

      const failsafe = setTimeout(() => {
        els.forEach((el) => {
          if (getComputedStyle(el).opacity === "0") {
            el.style.opacity = "1";
            el.style.transform = "translateY(0)";
          }
        });
      }, 4000);

      return () => {
        io.disconnect();
        clearTimeout(failsafe);
      };
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
