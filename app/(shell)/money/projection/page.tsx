import FIProjectionTab from "../../../components/FIProjectionTab";
import { getFIAssumptions } from "../../../lib/getFIAssumptions";
import { getAssetGrowthLog } from "../../../lib/getAssetGrowthLog";

export default async function ProjectionPage() {
  const [assumptions, actualLog] = await Promise.all([getFIAssumptions(), getAssetGrowthLog()]);
  return <FIProjectionTab initialAssumptions={assumptions} actualLog={actualLog} />;
}
