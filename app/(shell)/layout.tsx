import DataModeSwitch from "./DataModeSwitch";
import TopTabNav from "./TopTabNav";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      {/* Fills the window, capped only for ultrawide screens where lines would get unreadably long. */}
      <div className="max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-10 py-10">
        {/* Wraps so the real/dummy switch drops under the title on the narrowest phones. */}
        <header className="border-b-2 border-ink pb-8 mb-8 flex flex-wrap items-start justify-between gap-4">
          <h1
            className="font-display font-extrabold leading-none tracking-tight text-ink"
            style={{ fontSize: "clamp(40px,7vw,72px)" }}
          >
            Dashboard
          </h1>
          <DataModeSwitch />
        </header>

        <TopTabNav />

        {children}
      </div>
    </div>
  );
}
