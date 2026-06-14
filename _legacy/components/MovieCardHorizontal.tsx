import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { WatchlistButton } from "@/components/WatchlistButton";

interface MovieCardHorizontalProps {
  id: string;
  title: string;
  year: number;
  genre: string;
  rating: number;
  reviewCount: number;
  thumbnail: string;
  language: string;
  description?: string;
  editorNote?: string;
}

export const MovieCardHorizontal = ({ 
  id,
  title, 
  year, 
  genre, 
  rating, 
  reviewCount, 
  thumbnail, 
  language,
  description,
  editorNote
}: MovieCardHorizontalProps) => {
  // Display editor note if available, otherwise fall back to description
  const displayText = editorNote || description;
  return (
    <Link to={`/movie/${id}`} className="block">
      <Card className="group cursor-pointer transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 bg-card border-border overflow-hidden">
        <div className="flex flex-col sm:flex-row">
          {/* Poster */}
          <div className="relative overflow-hidden sm:w-48 sm:flex-shrink-0">
            <img 
              src={thumbnail} 
              alt={`${title} poster`}
              className="w-full h-48 sm:h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <div className="bg-primary/90 rounded-full p-3">
                <Play className="w-6 h-6 text-primary-foreground fill-current" />
              </div>
            </div>
            <Badge 
              variant="secondary" 
              className="absolute top-2 right-2 bg-secondary text-secondary-foreground"
            >
              {language}
            </Badge>
            
            {/* Watchlist Button Overlay */}
            <div className="absolute top-2 left-2">
              <WatchlistButton 
                movieId={id}
                movieTitle={title}
                variant="ghost" 
                size="sm" 
                showText={false}
              />
            </div>

            {/* Editor's Pick Badge */}
            <Badge 
              className="absolute bottom-2 left-2 bg-primary text-primary-foreground text-xs"
            >
              ✦ Editor's Pick
            </Badge>
          </div>
          
          {/* Content */}
          <CardContent className="p-4 sm:p-6 flex-1 flex flex-col justify-between">
            <div className="space-y-2">
              <h3 className="font-semibold text-lg sm:text-xl line-clamp-2 text-card-foreground">
                {title}
              </h3>
              
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{year}</span>
                <Badge variant="outline" className="text-xs">
                  {genre}
                </Badge>
              </div>

              {displayText && (
                <p className="text-sm text-muted-foreground line-clamp-2 hidden sm:block italic">
                  "{displayText}"
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-2 mt-3">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.floor(rating)
                        ? "text-rating-star fill-current"
                        : "text-muted-foreground"
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-foreground">
                {rating.toFixed(1)}
              </span>
              <span className="text-sm text-muted-foreground">
                ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
              </span>
            </div>
          </CardContent>
        </div>
      </Card>
    </Link>
  );
};
