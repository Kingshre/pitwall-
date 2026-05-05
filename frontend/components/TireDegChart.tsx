"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface Props {
  degData: any;
}

export default function TireDegChart({ degData }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!degData || !svgRef.current) return;

    const compounds = Object.entries(degData.compounds) as [string, any][];
    if (compounds.length === 0) return;

    const margin = { top: 20, right: 160, bottom: 50, left: 70 };
    const width = svgRef.current.clientWidth - margin.left - margin.right;
    const height = 380;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const allData = compounds.flatMap(([, c]) => c.data);
    const maxAge = d3.max(allData, (d: any) => d.tyre_age) || 40;
    const allTimes = allData.map((d: any) => d.avg_lap_time);
    const medianT = d3.median(allTimes) || 90;

    const x = d3.scaleLinear().domain([0, maxAge]).range([0, width]);
    const y = d3.scaleLinear()
      .domain([medianT * 0.97, medianT * 1.04])
      .range([height, 0])
      .nice();

    // Grid
    svg.append("g")
      .call(d3.axisLeft(y).ticks(6).tickSize(-width).tickFormat(() => ""))
      .call((g) => g.select(".domain").remove())
      .call((g) => g.selectAll(".tick line").attr("stroke", "#1E1E2E").attr("stroke-dasharray", "2,4"));

    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(10).tickFormat((d) => `Lap ${d}`))
      .call((g) => g.select(".domain").attr("stroke", "#1E1E2E"))
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

    // Draw each compound
    const line = d3.line<any>()
      .x((d) => x(d.tyre_age))
      .y((d) => y(d.avg_lap_time))
      .curve(d3.curveMonotoneX);

    // Trend line
    const trendLine = d3.line<[number, number]>()
      .x((d) => x(d[0]))
      .y((d) => y(d[1]));

    compounds.forEach(([compound, data], i) => {
      const color = data.color;
      const pts = data.data;

      // Scatter dots
      svg.selectAll(`.dot-${compound}`)
        .data(pts)
        .enter()
        .append("circle")
        .attr("cx", (d: any) => x(d.tyre_age))
        .attr("cy", (d: any) => y(d.avg_lap_time))
        .attr("r", 3)
        .attr("fill", color)
        .attr("opacity", 0.6);

      // Smoothed line
      svg.append("path")
        .datum(pts)
        .attr("fill", "none")
        .attr("stroke", color)
        .attr("stroke-width", 2)
        .attr("opacity", 0.9)
        .attr("d", line);

      // Trend line (linear regression)
      if (data.deg_rate !== 0) {
        const trendPts: [number, number][] = [
          [0, data.base_time],
          [maxAge, data.base_time + data.deg_rate * maxAge],
        ];
        svg.append("path")
          .datum(trendPts)
          .attr("fill", "none")
          .attr("stroke", color)
          .attr("stroke-width", 1)
          .attr("stroke-dasharray", "4,4")
          .attr("opacity", 0.4)
          .attr("d", trendLine);
      }

      // Legend
      const legendY = i * 52;
      svg.append("rect")
        .attr("x", width + 16)
        .attr("y", legendY)
        .attr("width", 14)
        .attr("height", 14)
        .attr("fill", color)
        .attr("rx", 2);

      svg.append("text")
        .attr("x", width + 34)
        .attr("y", legendY + 11)
        .attr("fill", color)
        .attr("font-size", "11px")
        .attr("font-weight", "500")
        .attr("font-family", "JetBrains Mono")
        .text(compound);

      svg.append("text")
        .attr("x", width + 16)
        .attr("y", legendY + 26)
        .attr("fill", "#4A4A6A")
        .attr("font-size", "9px")
        .attr("font-family", "JetBrains Mono")
        .text(`+${(data.deg_rate > 0 ? data.deg_rate : 0).toFixed(3)}s/lap`);
    });

    // Axis labels
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height + 42)
      .attr("text-anchor", "middle")
      .attr("fill", "#4A4A6A")
      .attr("font-size", "10px")
      .attr("font-family", "JetBrains Mono")
      .text("TYRE AGE (LAPS)");

  }, [degData]);

  if (!degData?.compounds || Object.keys(degData.compounds).length === 0) {
    return <div className="text-pitwall-muted font-mono text-sm p-8">No degradation data available for this race.</div>;
  }

  // Summary cards
  const compounds = Object.entries(degData.compounds) as [string, any][];

  return (
    <div>
      <div className="text-pitwall-muted font-mono text-xs uppercase tracking-widest mb-4">
        Tire Degradation · Solid = avg lap times · Dashed = linear trend
      </div>
      {/* Deg rate summary */}
      <div className="flex gap-4 mb-6">
        {compounds.map(([compound, data]) => (
          <div key={compound} className="border border-pitwall-border p-3 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-3 h-3 rounded-sm" style={{ background: data.color }} />
              <span className="font-mono text-xs text-pitwall-text">{compound}</span>
            </div>
            <div className="font-mono text-xl font-bold" style={{ color: data.color }}>
              +{Math.max(0, data.deg_rate).toFixed(3)}s
            </div>
            <div className="font-mono text-xs text-pitwall-muted">per lap</div>
          </div>
        ))}
      </div>
      <svg ref={svgRef} width="100%" style={{ overflow: "visible" }} />
    </div>
  );
}
