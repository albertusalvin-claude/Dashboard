import { connection } from "next/server";
import ReviewsTab from "../../../components/ReviewsTab";
import { dummyReviews, dummySpending } from "../../../lib/dummyData";

export default async function DummyExperiencePage() {
  await connection();
  const reviews = dummyReviews();
  // "Splurge" isn't on any review, to show an unused tag still offered.
  const tags = [...new Set([...reviews.flatMap((r) => r.tags), "Splurge"])];
  return <ReviewsTab reviews={reviews} tagOptions={tags} spending={dummySpending()} />;
}
