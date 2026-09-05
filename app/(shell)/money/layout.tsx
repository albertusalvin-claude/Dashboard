import SubTabNav from "./SubTabNav";

export default function MoneyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SubTabNav />
      {children}
    </div>
  );
}
