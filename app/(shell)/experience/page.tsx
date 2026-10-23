import ReviewsTab from "../../components/ReviewsTab";
import { getReviews, isReviewsConfigured } from "../../lib/getReviews";
import { getSpending } from "../../lib/getSpending";

export default async function ExperiencePage() {
  // Spending is only for linking a review to the purchase it's about.
  const [reviews, spending] = await Promise.all([isReviewsConfigured() ? getReviews() : null, getSpending()]);
  return <ReviewsTab reviews={reviews} spending={spending} />;
}
