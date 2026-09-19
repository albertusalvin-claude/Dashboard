import SubTabNav from "../../money/SubTabNav";

export default function DummyMoneyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SubTabNav />
      {children}
    </div>
  );
}
