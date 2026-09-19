export default function DummyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div
        className="rounded-xl border px-4 py-2.5 mb-6 text-sm flex items-center justify-between gap-3 flex-wrap"
        style={{ borderColor: "#B4832A", color: "#B4832A", background: "rgba(180,131,42,0.10)" }}
      >
        <span>
          <strong className="font-semibold">Dummy data.</strong> Every figure below is made up — nothing here is read
          from the real database.
        </span>
        <a href="/money" className="font-mono text-xs underline">
          back to the real dashboard
        </a>
      </div>
      {children}
    </div>
  );
}
