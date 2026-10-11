// Temporary shell used until each page's phase lands.
export default function PagePlaceholder({ title, phase }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center">
      <p className="eyebrow">Coming in {phase}</p>
      <h1 className="mt-2 text-4xl font-semibold">{title}</h1>
    </div>
  );
}
