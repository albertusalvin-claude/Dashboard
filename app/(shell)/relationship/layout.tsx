import SubTabNav from "./SubTabNav";

export default function RelationshipLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SubTabNav />
      {children}
    </div>
  );
}
