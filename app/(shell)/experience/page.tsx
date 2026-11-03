import ReviewsTab from "../../components/ReviewsTab";
import { getReviewTags, getReviews, isReviewsConfigured } from "../../lib/getReviews";
import { getSpending } from "../../lib/getSpending";

export default async function ExperiencePage() {
  // Spending is only for linking a review to the purchase it's about.
  const [reviews, tags, spending] = await Promise.all([
    isReviewsConfigured() ? getReviews() : null,
    getReviewTags(),
    getSpending(),
  ]);
  return <ReviewsTab reviews={reviews} tagOptions={tags} spending={spending} />;
}
