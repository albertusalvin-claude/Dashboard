import FIProjectionTab from "../../../components/FIProjectionTab";
import { getFIAssumptions } from "../../../lib/getFIAssumptions";

export default async function ProjectionPage() {
  const assumptions = await getFIAssumptions();
  return <FIProjectionTab initialAssumptions={assumptions} />;
}
