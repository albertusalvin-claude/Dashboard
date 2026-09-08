import MovieBacklog from "../../components/MovieBacklog";
import { getMovieBacklog } from "../../lib/getMovieBacklog";

export default async function MoviesPage() {
  const movies = await getMovieBacklog();
  return <MovieBacklog movies={movies} />;
}
