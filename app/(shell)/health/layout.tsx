import SubTabNav from "./SubTabNav";

export default function HealthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SubTabNav />
      {children}
    </div>
  );
}
