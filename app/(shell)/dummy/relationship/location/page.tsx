import RelationshipMapTab from "../../../../components/RelationshipMapTab";
import { dummyPeople, dummyRelationshipOptions } from "../../../../lib/dummyData";

export default function DummyLocationPage() {
  // configured={} is what keeps the map showing instead of the setup card. The
  // add/edit buttons still appear, but PersonForm refuses to write on /dummy.
  return <RelationshipMapTab people={dummyPeople()} configured options={dummyRelationshipOptions()} />;
}
