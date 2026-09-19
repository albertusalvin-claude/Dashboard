import { connection } from "next/server";
import FIProjectionTab from "../../../../components/FIProjectionTab";
import { dummyAssetGrowthLog, dummyFIAssumptions } from "../../../../lib/dummyData";

export default async function DummyProjectionPage() {
  // The fixtures are dated relative to today, so this must not be prerendered.
  await connection();
  return <FIProjectionTab initialAssumptions={dummyFIAssumptions()} actualLog={dummyAssetGrowthLog()} />;
}
