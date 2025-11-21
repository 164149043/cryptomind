import React, { useEffect, useState } from 'react';

interface Connection {
  from: string;
  to: string;
}

interface Point {
  x: number;
  y: number;
}

interface ConnectionsOverlayProps {
  connections: Connection[];
  containerRef: React.RefObject<HTMLDivElement | null>;
  lineColor: string;
}

export const ConnectionsOverlay: React.FC<ConnectionsOverlayProps> = ({
  connections,
  containerRef,
  lineColor
}) => {
  const [paths, setPaths] = useState<{ d: string; key: string }[]>([]);

  const updatePaths = () => {
    if (!containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const newPaths: { d: string; key: string }[] = [];

    connections.forEach(({ from, to }) => {
      const fromEl = document.getElementById(from);
      const toEl = document.getElementById(to);

      if (fromEl && toEl) {
        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();

        // Calculate start point (bottom center of 'from') relative to container
        const start: Point = {
          x: fromRect.left + fromRect.width / 2 - containerRect.left,
          y: fromRect.bottom - containerRect.top,
        };

        // Calculate end point (top center of 'to') relative to container
        const end: Point = {
          x: toRect.left + toRect.width / 2 - containerRect.left,
          y: toRect.top - containerRect.top,
        };

        // Bezier Curve Logic
        const deltaY = end.y - start.y;
        // Control points at 50% of the vertical distance
        const midY = start.y + deltaY / 2;

        // S-Curve: Move to Start, Cubic Bezier to End
        const d = `M ${start.x} ${start.y} C ${start.x} ${midY}, ${end.x} ${midY}, ${end.x} ${end.y}`;
        
        newPaths.push({ d, key: `${from}-${to}` });
      }
    });

    setPaths(newPaths);
  };

  useEffect(() => {
    // Initial draw
    updatePaths();

    // Redraw on window resize
    window.addEventListener('resize', updatePaths);
    
    // Observe container for size changes
    const observer = new ResizeObserver(updatePaths);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    
    // Polling fallback to catch animations/expansions that ResizeObserver might miss in children
    const interval = setInterval(updatePaths, 1000);

    return () => {
      window.removeEventListener('resize', updatePaths);
      observer.disconnect();
      clearInterval(interval);
    };
  }, [connections, containerRef]);

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-0">
      <defs>
         <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill={lineColor} opacity="0.4" />
         </marker>
      </defs>
      {paths.map((path) => (
        <path
          key={path.key}
          d={path.d}
          fill="none"
          stroke={lineColor}
          strokeWidth="1.5"
          strokeOpacity="0.3"
          markerEnd="url(#arrowhead)"
          className="transition-all duration-500 ease-in-out"
        />
      ))}
    </svg>
  );
};