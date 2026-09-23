/**
 * Tiny chart maths — enough for the marketing dashboard, no library needed.
 * Returns a smoothed line path plus a closed area path for the gradient fill.
 */
export function buildAreaPath(values, width, height, pad = 6) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const innerH = height - pad * 2;

  const pts = values.map((v, i) => [
    (i / (values.length - 1)) * width,
    pad + innerH - ((v - min) / span) * innerH,
  ]);

  let line = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const cx = (x0 + x1) / 2;
    line += ` C ${cx.toFixed(2)} ${y0.toFixed(2)}, ${cx.toFixed(2)} ${y1.toFixed(2)}, ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  }

  const area = `${line} L ${width} ${height} L 0 ${height} Z`;

  return { line, area, points: pts };
}

function smoothLine(pts) {
  let line = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const cx = (x0 + x1) / 2;
    line += ` C ${cx.toFixed(2)} ${y0.toFixed(2)}, ${cx.toFixed(2)} ${y1.toFixed(2)}, ${x1.toFixed(2)} ${y1.toFixed(2)}`;
  }
  return line;
}

/**
 * Real sales for the owner's dashboard: this period and the one before on a
 * single scale from zero, so the dashed comparison line means something and a
 * quiet day reads as quiet instead of being stretched to fill the chart.
 */
export function buildComparisonPaths(values, previous, width, height, pad = 6) {
  const max = Math.max(1, ...values, ...previous);
  const innerH = height - pad * 2;
  const toPoints = (list) =>
    list.map((v, i) => [
      list.length > 1 ? (i / (list.length - 1)) * width : width / 2,
      pad + innerH - (v / max) * innerH,
    ]);

  const pts = toPoints(values);
  const line = smoothLine(pts);
  const area = `${line} L ${width} ${height} L 0 ${height} Z`;
  const prevLine = previous.length > 1 ? smoothLine(toPoints(previous)) : null;

  return { line, area, prevLine, max };
}
