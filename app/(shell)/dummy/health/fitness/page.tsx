import { connection } from "next/server";
import FitnessTab from "../../../../components/FitnessTab";
import { dummyBPLog, dummyWeightLog } from "../../../../lib/dummyData";

export default async function DummyFitnessPage() {
  await connection();
  return <FitnessTab weightLog={dummyWeightLog()} bpLog={dummyBPLog()} />;
}
