export function Bar({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, value));
  const cls = v >= 65 ? 'good' : v >= 40 ? 'warn' : 'bad';
  return (
    <div className="bar-row">
      <span className="bar-label">{label}</span>
      <div className="bar-track">
        <div className={`bar-fill ${cls}`} style={{ width: `${v}%` }} />
      </div>
      <span className="bar-value">{Math.round(v)}</span>
    </div>
  );
}
