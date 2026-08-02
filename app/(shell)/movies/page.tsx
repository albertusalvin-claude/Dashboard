import MovieBacklog from "../../components/MovieBacklog";
import { getEvents } from "../../lib/getEvents";

export default async function MoviesPage() {
  const movies = await getEvents("Movie", "New");
  return <MovieBacklog movies={movies} />;
}
