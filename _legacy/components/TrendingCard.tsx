import { Star } from "lucide-react";
import { Link } from "react-router-dom";

interface TrendingCardProps {
  id: string;
  title: string;
  rating: number;
  thumbnail: string;
}

export const TrendingCard = ({ 
  id,
  title, 
  rating, 
  thumbnail 
}: TrendingCardProps) => {
  return (
    <Link to={`/movie/${id}`} className="block group">
      <div className="relative overflow-hidden rounded-xl aspect-[16/9]">
        <img 
          src={thumbnail} 
          alt={`${title} poster`}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        {/* Content overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className="font-bold text-white text-lg line-clamp-1 mb-1">
            {title.toUpperCase()}
          </h3>
          <p className="text-white/80 text-sm">Watch Now</p>
        </div>
        
        {/* Rating badge */}
        <div className="absolute bottom-4 right-4 bg-primary text-primary-foreground px-2 py-1 rounded-md flex items-center gap-1 text-sm font-medium">
          <Star className="w-3.5 h-3.5 fill-current" />
          {rating.toFixed(1)}
        </div>
      </div>
    </Link>
  );
};
