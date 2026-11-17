const COLORS = ["#1b5fa8", "#c9a227", "#2f9e6e", "#8a5cc2", "#d9622b", "#6b7a8c"];

export function DonutChart({ data, centerLabel }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const R = 42;
  const C = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 120 120" className="donut" role="img" aria-label={centerLabel}>
        <circle cx="60" cy="60" r={R} fill="none" stroke="#eef2f7" strokeWidth="16" />
        {total > 0 &&
          data.map((d, i) => {
            const len = (d.value / total) * C;
            const segment = (
              <circle
                key={d.label}
                cx="60"
                cy="60"
                r={R}
                fill="none"
                stroke={COLORS[i % COLORS.length]}
                strokeWidth="16"
                strokeDasharray={`${len} ${C - len}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 60 60)"
              >
                <title>{`${d.label}: ${d.value}`}</title>
              </circle>
            );
            offset += len;
            return segment;
          })}
        <text x="60" y="58" textAnchor="middle" className="donut-total">
          {total}
        </text>
        <text x="60" y="73" textAnchor="middle" className="donut-sub">
          {centerLabel}
        </text>
      </svg>

      <ul className="legend">
        {data.map((d, i) => (
          <li key={d.label}>
            <span className="legend-dot" style={{ background: COLORS[i % COLORS.length] }} />
            <span className="legend-label">{d.label}</span>
            <span className="legend-value">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ColumnChart({ data, color = "#1b5fa8" }) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="col-chart">
      {data.map((d) => (
        <div key={d.label} className="col-item" title={`${d.label}: ${d.value}`}>
          <div className="col-value">{d.value}</div>
          <div className="col-bar-wrap">
            <div
              className="col-bar"
              style={{ height: `${(d.value / max) * 100}%`, background: color }}
            />
          </div>
          <div className="col-label">{d.label}</div>
        </div>
      ))}
    </div>
  );
}