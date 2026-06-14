import MovieReviews from './MovieReviews';

// Example usage of MovieReviews component
const MovieReviewsExample = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">MovieReviews Component Examples</h1>
      
      <div className="space-y-12">
        {/* Example 1: Basic Usage */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Basic Usage</h2>
          <MovieReviews 
            movieId="550e8400-e29b-41d4-a716-446655440010" 
            movieTitle="The Wedding Party 2" 
          />
        </section>

        {/* Example 2: Different Movie */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">Another Movie</h2>
          <MovieReviews 
            movieId="550e8400-e29b-41d4-a716-446655440011" 
            movieTitle="King of Boys" 
          />
        </section>
      </div>
    </div>
  );
};

export default MovieReviewsExample;
