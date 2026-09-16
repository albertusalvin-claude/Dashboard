import RelationshipMapTab from "../../../components/RelationshipMapTab";
import { getRelationships, isRelationshipsConfigured } from "../../../lib/getRelationships";
import { getRelationshipOptions } from "../../../lib/getRelationshipOptions";

export default async function LocationPage() {
  const [people, options] = await Promise.all([getRelationships(), getRelationshipOptions()]);

  return <RelationshipMapTab people={people} configured={isRelationshipsConfigured()} options={options} />;
}
