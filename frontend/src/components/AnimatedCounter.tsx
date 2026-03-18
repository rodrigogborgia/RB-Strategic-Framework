import React, { useEffect, useState } from "react";

export const AnimatedCounter = ({
  value,
  label,
}: {
  value: number;
  label: string;
}) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) return;
    const increment = end > 100 ? 5 : 1;
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        start = end;
        clearInterval(timer);
      }
      setCount(start);
    }, 40);
    return () => clearInterval(timer);
  }, [value]);
  return (
    <div className="counter-block">
      <span className="counter-value">{count}+</span>
      <span className="counter-label">{label}</span>
    </div>
  );
};
