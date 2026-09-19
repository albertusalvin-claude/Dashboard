import SubTabNav from "../../relationship/SubTabNav";

export default function DummyRelationshipLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <SubTabNav />
      {children}
    </div>
  );
}
