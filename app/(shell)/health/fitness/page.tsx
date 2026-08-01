import FitnessTab from "../../../components/FitnessTab";
import { getWeightLog } from "../../../lib/getWeightLog";
import { getBPLog } from "../../../lib/getBPLog";

export default async function FitnessPage() {
  const [weightLog, bpLog] = await Promise.all([getWeightLog(), getBPLog()]);
  return <FitnessTab weightLog={weightLog} bpLog={bpLog} />;
}
