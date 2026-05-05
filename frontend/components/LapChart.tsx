"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

const DRIVER_COLORS = [
  "#E8002D", "#FF6B35", "#FFF200", "#00D2BE", "#0067FF",
  "#DC0000", "#FF8700", "#006F62", "#005AFF", "#B6BABD",
  "#C92D4B", "#F596C8", "#0090FF", "#2293D1", "#00A0DE",
];

interface Props {
  lapData: any;
  selectedDrivers: string[];
}

export default function LapChart({ lapData, selectedDrivers }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!lapData || !svgRef.current) return;

    const drivers = lapData.drivers.filter((d: any) => selectedDrivers.includes(d.driver));
    if (drivers.length === 0) return;

    const margin = { top: 20, right: 120, bottom: 40, left: 70 };
    const width = svgRef.current.clientWidth - margin.left - margin.right;
    const height = 420;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Flatten all lap times for domain
    const allLaps = drivers.flatMap((d: any) => d.laps);
    const validTimes = allLaps.map((l: any) => l.lap_time).filter((t: number) => t > 0 && t < 200);
    const medianTime = d3.median(validTimes) || 90;

    const x = d3.scaleLinear().domain([1, lapData.total_laps]).range([0, width]);
    const y = d3.scaleLinear()
      .domain([medianTime * 0.96, medianTime * 1.06])
      .range([height, 0])
      .nice();

    // Grid
    svg.append("g")
      .call(d3.axisLeft(y).ticks(6).tickSize(-width).tickFormat(() => ""))
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll(".tick line")
        .attr("stroke", "#1E1E2E")
        .attr("stroke-dasharray", "2,4")
      );

    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(15).tickFormat((d) => `${d}`))
      .call((g) => g.select(".domain").attr("stroke", "#1E1E2E"))
      .call((g) => g.selectAll(".tick line").attr("stroke", "#1E1E2E"))
      .call((g) => g.selectAll(".tick text").attr("fill", "#4A4A6A").attr("font-size", "10px").attr("font-family", "JetBrains Mono"));

    svg.append("g")
      .call(d3.axisLeft(y).ticks(6).tickFormat((d) => {
        const t = Number(d);
        const mins = Math.floor(t / 60);
        const secs = (t % 60).toFixed(1);
        return `${mins}:${secs.padStart(4, "0")}`;
      }))
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll(".tick text").attr("fill", "#4A4A6A").attr("font-size", "10px").attr("font-family", "JetBrains Mono"));

    // Lines
    const line = d3.line<any>()
      .x((d) => x(d.lap))
      .y((d) => y(d.lap_time))
      .defined((d) => d.lap_time > 0 && d.lap_time < medianTime * 1.06)
      .curve(d3.curveMonotoneX);

    drivers.forEach((driver: any, i: number) => {
      const color = DRIVER_COLORS[i % DRIVER_COLORS.length];

      svg.append("path")
        .datum(driver.laps)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 1.5)
        .attr("opacity", 0.85)
        .attr("d", line);

      // Pit stop markers
      driver.pit_laps.forEach((pitLap: number) => {
        svg.append("line")
          .attr("x1", x(pitLap))
          .attr("x2", x(pitLap))
          .attr("y1", 0)
          .attr("y2", height)
          .attr("stroke", color)
          .attr("stroke-width", 0.5)
          .attr("stroke-dasharray", "3,3")
          .attr("opacity", 0.4);
      });

      // Legend
      svg.append("rect")
        .attr("x", width + 10)
        .attr("y", i * 18)
        .attr("width", 12)
        .attr("height", 3)
        .attr("fill", color);

      svg.append("text")
        .attr("x", width + 26)
        .attr("y", i * 18 + 4)
        .attr("fill", color)
        .attr("font-size", "10px")
        .attr("font-family", "JetBrains Mono")
        .text(driver.driver);
    });

    // Axis labels
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height + 35)
      .attr("text-anchor", "middle")
      .attr("fill", "#4A4A6A")
      .attr("font-size", "10px")
      .attr("font-family", "JetBrains Mono")
      .text("LAP");

    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -55)
      .attr("text-anchor", "middle")
      .attr("fill", "#4A4A6A")
      .attr("font-size", "10px")
      .attr("font-family", "JetBrains Mono")
      .text("LAP TIME");

  }, [lapData, selectedDrivers]);

  return (
    <div>
      <div className="text-pitwall-muted font-mono text-xs uppercase tracking-widest mb-4">
        Lap Times · Dashed verticals = Pit stops
      </div>
      <div ref={tooltipRef} className="hidden absolute bg-pitwall-bg border border-pitwall-border p-2 font-mono text-xs pointer-events-none" />
      <svg ref={svgRef} width="100%" style={{ overflow: "visible" }} />
    </div>
  );
}
