import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Play, Award } from "lucide-react";
import { Link } from "react-router-dom";
import { WatchlistButton } from "@/components/WatchlistButton";

interface MovieCardProps {
  id: string;
  title: string;
  year: number;
  genre: string;
  rating: number;
  reviewCount: number;
  thumbnail: string;
  language: string;
  rank?: number;
  isCanon?: boolean;
}

export const MovieCard = ({ 
  id,
  title, 
  year, 
  genre, 
  rating, 
  reviewCount, 
  thumbnail, 
  language,
  rank,
  isCanon
}: MovieCardProps) => {
  return (
    <Link to={`/movie/${id}`} className="block">
      <Card className={`group cursor-pointer transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 ${
        isCanon 
          ? 'bg-gradient-to-b from-zinc-900 to-zinc-950 border-amber-500/40 ring-1 ring-amber-400/20 shadow-lg shadow-amber-900/10' 
          : 'bg-card border-border'
      }`}>
      <div className="relative overflow-hidden rounded-t-lg">
        <img 
          src={thumbnail} 
          alt={`${title} poster`}
          className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className={`rounded-full p-3 ${isCanon ? 'bg-amber-500/90' : 'bg-primary/90'}`}>
            <Play className={`w-6 h-6 fill-current ${isCanon ? 'text-zinc-900' : 'text-primary-foreground'}`} />
          </div>
        </div>
        <Badge 
          variant="secondary" 
          className={isCanon 
            ? "absolute top-2 right-2 bg-amber-500 text-zinc-900 font-semibold border-0" 
            : "absolute top-2 right-2 bg-secondary text-secondary-foreground"
          }
        >
          {language}
        </Badge>
        
        {/* Ranking Badge */}
        {rank && (
          <div className="absolute -bottom-3 -left-1 w-12 h-12 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl font-bold shadow-lg border-2 border-background">
            #{rank}
          </div>
        )}
        
        {/* Canon Badge */}
        {isCanon && !rank && (
          <div className="absolute -bottom-3 -left-1 w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 text-zinc-900 rounded-full flex items-center justify-center shadow-lg border-2 border-zinc-900">
            <Award className="w-5 h-5" />
          </div>
        )}
        
        {/* Be the first to review badge */}
        {reviewCount === 0 && !rank && (
          <Badge 
            className="absolute bottom-2 left-2 right-2 bg-primary/90 text-primary-foreground text-xs animate-pulse"
          >
            ✨ Be the first to review!
          </Badge>
        )}
        
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
      </div>
      
      <CardContent className="p-4">
        <div className="space-y-2">
          <h3 className={`font-semibold text-lg line-clamp-2 ${isCanon ? 'text-amber-50' : 'text-card-foreground'}`}>
            {title}
          </h3>
          
          <div className={`flex items-center justify-between text-sm ${isCanon ? 'text-zinc-400' : 'text-muted-foreground'}`}>
            <span>{year}</span>
            <Badge variant="outline" className={`text-xs ${isCanon ? 'border-amber-500/40 text-amber-400' : ''}`}>
              {genre}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.floor(rating)
                      ? isCanon ? "text-amber-400 fill-current" : "text-rating-star fill-current"
                      : isCanon ? "text-zinc-600" : "text-muted-foreground"
                  }`}
                />
              ))}
            </div>
            <span className={`text-sm font-medium ${isCanon ? 'text-amber-50' : 'text-foreground'}`}>
              {rating.toFixed(1)}
            </span>
            <span className={`text-sm ${isCanon ? 'text-zinc-400' : 'text-muted-foreground'}`}>
              ({reviewCount} reviews)
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
    </Link>
  );
};