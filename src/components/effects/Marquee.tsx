/**
 * Marquee: a slow, endless row of short labels. Pure CSS, no client JS.
 * The duplicate row is aria-hidden so screen readers hear each item once, and
 * the animation stops for reduced-motion users (see .rd-marquee in globals.css).
 */
export default function Marquee({ items }: { items: string[] }) {
  const row = (hidden: boolean) => (
    <ul className="rd-marquee-row" aria-hidden={hidden || undefined}>
      {items.map((item) => (
        <li key={item} className="rd-marquee-item">
          <span className="rd-marquee-dot" aria-hidden="true" />
          {item}
        </li>
      ))}
    </ul>
  );
  return (
    <div className="rd-marquee" role="region" aria-label="What the desk does">
      <div className="rd-marquee-track">
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
