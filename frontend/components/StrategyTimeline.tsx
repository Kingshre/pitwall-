"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

const TIRE_COLORS: Record<string, string> = {
  SOFT: "#E8002D",
  MEDIUM: "#FFF200",
  HARD: "#EBEBEB",
  INTERMEDIATE: "#39B54A",
  WET: "#0067FF",
  UNKNOWN: "#666",
};

interface Props {
  lapData: any;
  strategyData: any;
  selectedDrivers: string[];
}

export default function StrategyTimeline({ lapData, strategyData, selectedDrivers }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!lapData || !svgRef.current) return;

    const drivers = lapData.drivers.filter((d: any) => selectedDrivers.includes(d.driver));
    if (drivers.length === 0) return;

    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const width = svgRef.current.clientWidth - margin.left - margin.right;
    const rowH = 36;
    const height = drivers.length * rowH;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const totalLaps = lapData.total_laps;
    const x = d3.scaleLinear().domain([1, totalLaps]).range([0, width]);
    const y = d3.scaleBand()
      .domain(drivers.map((d: any) => d.driver))
      .range([0, height])
      .padding(0.2);

    // X axis
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(10).tickFormat((d) => `L${d}`))
      .call((g) => g.select(".domain").attr("stroke", "#1E1E2E"))
      .call((g) => g.selectAll(".tick line").attr("stroke", "#1E1E2E"))
      .call((g) => g.selectAll(".tick text").attr("fill", "#4A4A6A").attr("font-size", "10px").attr("font-family", "JetBrains Mono"));

    // Y axis
    svg.append("g")
      .call(d3.axisLeft(y).tickSize(0))
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll(".tick text")
        .attr("fill", "#E8E8F0")
        .attr("font-size", "11px")
        .attr("font-family", "JetBrains Mono")
        .attr("font-weight", "500")
      );

    // Vertical lap grid
    svg.append("g")
      .attr("class", "grid")
      .call(
        d3.axisBottom(x)
          .ticks(20)
          .tickSize(height)
          .tickFormat(() => "")
      )
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll(".tick line")
        .attr("stroke", "#1E1E2E")
        .attr("stroke-dasharray", "2,4")
        .attr("y1", -height)
        .attr("y2", 0)
      )
      .attr("transform", `translate(0,${height})`);

    // Draw stints as colored bars
    drivers.forEach((driver: any) => {
      const driverY = y(driver.driver)!;
      const barH = y.bandwidth();

      // Group laps into stints
      const stints: { start: number; end: number; compound: string }[] = [];
      let currentStint = { start: 1, end: 1, compound: "UNKNOWN" };

      driver.laps.forEach((lap: any, i: number) => {
        if (i === 0) {
          currentStint = { start: lap.lap, end: lap.lap, compound: lap.compound };
        } else if (lap.stint !== driver.laps[i - 1].stint) {
          stints.push({ ...currentStint });
          currentStint = { start: lap.lap, end: lap.lap, compound: lap.compound };
        } else {
          currentStint.end = lap.lap;
        }
      });
      stints.push(currentStint);

      stints.forEach((stint) => {
        const color = TIRE_COLORS[stint.compound] || TIRE_COLORS.UNKNOWN;
        const xStart = x(stint.start);
        const xEnd = x(stint.end + 1);

        svg.append("rect")
          .attr("x", xStart)
          .attr("y", driverY)
          .attr("width", Math.max(0, xEnd - xStart - 1))
          .attr("height", barH)
          .attr("fill", color)
          .attr("opacity", 0.85)
          .attr("rx", 2);

        // Compound label inside bar if wide enough
        if (xEnd - xStart > 30) {
          svg.append("text")
            .attr("x", xStart + (xEnd - xStart) / 2)
            .attr("y", driverY + barH / 2 + 4)
            .attr("text-anchor", "middle")
            .attr("fill", stint.compound === "MEDIUM" || stint.compound === "HARD" ? "#000" : "#fff")
            .attr("font-size", "9px")
            .attr("font-family", "JetBrains Mono")
            .attr("font-weight", "500")
            .text(stint.compound.slice(0, 1));
        }
      });

      // Pit stop markers
      driver.pit_laps.forEach((pitLap: number) => {
        svg.append("line")
          .attr("x1", x(pitLap))
          .attr("x2", x(pitLap))
          .attr("y1", driverY - 2)
          .attr("y2", driverY + barH + 2)
          .attr("stroke", "#fff")
          .attr("stroke-width", 1.5)
          .attr("opacity", 0.7);
      });
    });

    // Legend
    const legendData = Object.entries(TIRE_COLORS).filter(([k]) => k !== "UNKNOWN");
    const legend = svg.append("g").attr("transform", `translate(${width - 220}, -16)`);
    legendData.forEach(([compound, color], i) => {
      legend.append("rect")
        .attr("x", i * 40)
        .attr("y", 0)
        .attr("width", 12)
        .attr("height", 12)
        .attr("fill", color)
        .attr("rx", 2);
      legend.append("text")
        .attr("x", i * 40 + 14)
        .attr("y", 10)
        .attr("fill", "#4A4A6A")
        .attr("font-size", "8px")
        .attr("font-family", "JetBrains Mono")
        .text(compound.slice(0, 1));
    });
  }, [lapData, strategyData, selectedDrivers]);

  return (
    <div>
      <div className="text-pitwall-muted font-mono text-xs uppercase tracking-widest mb-4">
        Stint Map · Colored by Tire Compound · White lines = Pit stops
      </div>
      <svg ref={svgRef} width="100%" style={{ overflow: "visible" }} />
    </div>
  );
}
