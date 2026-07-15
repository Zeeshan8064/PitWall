import React, { useEffect, useRef, useState } from "react";

type Props = {
  children: React.ReactNode;
};

export default function HorizontalScroller({ children }: Props) {
  const items = React.Children.toArray(children);
  const total = items.length;

  const [current, setCurrent] = useState(0);

  const locked = useRef(false);
  const wheelEndTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const wheel = (e: WheelEvent) => {
      e.preventDefault();

      // Reset the "wheel has ended" timer on every event
      if (wheelEndTimeout.current) {
        clearTimeout(wheelEndTimeout.current);
      }

      // Ignore all wheel events until this gesture finishes
      if (locked.current) {
        wheelEndTimeout.current = setTimeout(() => {
          locked.current = false;
        }, 150);

        return;
      }

      locked.current = true;

      if (e.deltaY > 0) {
        setCurrent((prev) => Math.min(prev + 1, total - 1));
      } else if (e.deltaY < 0) {
        setCurrent((prev) => Math.max(prev - 1, 0));
      }

      // Unlock only after wheel events stop for 150ms
      wheelEndTimeout.current = setTimeout(() => {
        locked.current = false;
      }, 150);
    };

    window.addEventListener("wheel", wheel, { passive: false });

    return () => {
      window.removeEventListener("wheel", wheel);

      if (wheelEndTimeout.current) {
        clearTimeout(wheelEndTimeout.current);
      }
    };
  }, [total]);

  return (
    <div className="overflow-hidden">
      <div
        className="flex transition-transform duration-700 ease-in-out"
        style={{
          width: `${total * 100}vw`,
          transform: `translateX(-${current * 100}vw)`,
        }}
      >
        {items.map((child, i) => (
          <div key={i} className="w-screen shrink-0">
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}