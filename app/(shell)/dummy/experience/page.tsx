import { connection } from "next/server";
import ReviewsTab from "../../../components/ReviewsTab";
import { dummyReviews, dummySpending } from "../../../lib/dummyData";

export default async function DummyExperiencePage() {
  await connection();
  return <ReviewsTab reviews={dummyReviews()} spending={dummySpending()} />;
}
