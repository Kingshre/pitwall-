"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

const AXES = [
  { key: "qualifying_pace", label: "QUALIFYING" },
  { key: "race_pace", label: "RACE PACE" },
  { key: "tire_management", label: "TYRE MGMT" },
  { key: "consistency", label: "CONSISTENCY" },
  { key: "overtaking", label: "OVERTAKING" },
  { key: "wet_weather", label: "WET WEATHER" },
];

const COLORS = ["#E8002D", "#00D2BE", "#FFF200", "#FF8700", "#0067FF", "#39B54A"];

interface DriverData {
  driver: string;
  scores: Record<string, number>;
  rounds_analyzed: number;
}

interface Props {
  drivers: DriverData[];
}

export default function DriverDNA({ drivers }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!drivers.length || !svgRef.current) return;

    const size = 400;
    const cx = size / 2;
    const cy = size / 2;
    const radius = 140;
    const levels = 5;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("viewBox", `0 0 ${size} ${size}`)
      .attr("width", "100%")
      .attr("height", size);

    const angleSlice = (Math.PI * 2) / AXES.length;

    const rScale = d3.scaleLinear().domain([0, 100]).range([0, radius]);

    // Draw grid circles
    for (let level = 1; level <= levels; level++) {
      const r = (radius / levels) * level;
      svg.append("circle")
        .attr("cx", cx).attr("cy", cy).attr("r", r)
        .attr("fill", "none")
        .attr("stroke", "#1E1E2E")
        .attr("stroke-width", 1);

      svg.append("text")
        .attr("x", cx + 4)
        .attr("y", cy - r + 4)
        .attr("fill", "#4A4A6A")
        .attr("font-size", "8px")
        .attr("font-family", "JetBrains Mono")
        .text(`${(level / levels) * 100}`);
    }

    // Draw axis lines and labels
    AXES.forEach((axis, i) => {
      const angle = angleSlice * i - Math.PI / 2;
      const x2 = cx + radius * Math.cos(angle);
      const y2 = cy + radius * Math.sin(angle);
      const lx = cx + (radius + 22) * Math.cos(angle);
      const ly = cy + (radius + 22) * Math.sin(angle);

      svg.append("line")
        .attr("x1", cx).attr("y1", cy)
        .attr("x2", x2).attr("y2", y2)
        .attr("stroke", "#1E1E2E")
        .attr("stroke-width", 1);

      svg.append("text")
        .attr("x", lx)
        .attr("y", ly + 4)
        .attr("text-anchor", "middle")
        .attr("fill", "#4A4A6A")
        .attr("font-size", "8px")
        .attr("font-family", "JetBrains Mono")
        .attr("font-weight", "500")
        .text(axis.label);
    });

    // Draw driver polygons
    drivers.forEach((driver, di) => {
      const color = COLORS[di % COLORS.length];

      const points = AXES.map((axis, i) => {
        const angle = angleSlice * i - Math.PI / 2;
        const val = driver.scores[axis.key] ?? 50;
        const r = rScale(val);
        return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)] as [number, number];
      });

      const lineGen = d3.line<[number, number]>().x(d => d[0]).y(d => d[1]).curve(d3.curveLinearClosed);

      svg.append("path")
        .datum(points)
        .attr("d", lineGen)
        .attr("fill", color)
        .attr("fill-opacity", 0.15)
        .attr("stroke", color)
        .attr("stroke-width", 2);

      // Dots at each axis
      points.forEach(([px, py], i) => {
        svg.append("circle")
          .attr("cx", px).attr("cy", py).attr("r", 3)
          .attr("fill", color);
      });
    });

  }, [drivers]);

  if (!drivers.length) return null;

  return (
    <div className="flex flex-col items-center">
      <svg ref={svgRef} />
      {/* Legend */}
      <div className="flex gap-6 mt-4">
        {drivers.map((d, i) => (
          <div key={d.driver} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="font-mono text-xs text-pitwall-text">{d.driver}</span>
            <span className="font-mono text-xs text-pitwall-muted">({d.rounds_analyzed} races)</span>
          </div>
        ))}
      </div>
      {/* Score table */}
      <div className="mt-6 w-full overflow-x-auto">
        <table className="w-full font-mono text-xs">
          <thead>
            <tr className="border-b border-pitwall-border">
              <th className="text-left py-2 text-pitwall-muted">METRIC</th>
              {drivers.map((d, i) => (
                <th key={d.driver} className="text-right py-2" style={{ color: COLORS[i % COLORS.length] }}>
                  {d.driver}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {AXES.map(axis => (
              <tr key={axis.key} className="border-b border-pitwall-border/50">
                <td className="py-2 text-pitwall-muted">{axis.label}</td>
                {drivers.map((d, i) => (
                  <td key={d.driver} className="text-right py-2 text-pitwall-text">
                    {(d.scores[axis.key] ?? 50).toFixed(1)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}