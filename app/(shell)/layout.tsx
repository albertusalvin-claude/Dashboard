import DataModeSwitch from "./DataModeSwitch";
import TopTabNav from "./TopTabNav";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <header className="border-b-2 border-ink pb-8 mb-8 flex items-start justify-between gap-4">
          <h1
            className="font-display font-extrabold leading-none tracking-tight text-ink"
            style={{ fontSize: "clamp(40px,7vw,72px)" }}
          >
            Life Dashboard
          </h1>
          <DataModeSwitch />
        </header>

        <TopTabNav />

        {children}
      </div>
    </div>
  );
}
