import SubTabNav from "../../health/SubTabNav";

export default function DummyHealthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SubTabNav />
      {children}
    </div>
  );
}
