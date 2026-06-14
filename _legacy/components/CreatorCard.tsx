import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Film, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Creator } from '@/hooks/useCreators';

interface CreatorCardProps {
  creator: Creator;
  movieCount?: number;
}

const CreatorCard: React.FC<CreatorCardProps> = ({ creator, movieCount = 0 }) => {
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <CardHeader className="p-0">
        <div className="relative overflow-hidden rounded-t-lg">
          <div className="aspect-square w-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
            {creator.image_url ? (
              <img
                src={creator.image_url}
                alt={creator.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <Users className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      </CardHeader>
      
      <CardContent className="p-4 space-y-3">
        <div className="space-y-2">
                           <Link to={`/creator/${creator.id}`}>
                   <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors cursor-pointer">
                     {creator.name}
                   </h3>
                 </Link>
          
          {creator.bio && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {creator.bio}
            </p>
          )}
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Film className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {movieCount} movie{movieCount !== 1 ? 's' : ''}
            </span>
          </div>
          
          <Badge variant="secondary" className="text-xs">
            Creator
          </Badge>
        </div>
        
        <div className="flex gap-2">
                         <Button 
                 variant="outline" 
                 size="sm" 
                 className="flex-1 group-hover:border-primary group-hover:text-primary transition-colors"
                 asChild
               >
                 <Link to={`/creator/${creator.id}`}>
                   <Film className="h-4 w-4 mr-2" />
                   View Profile
                 </Link>
               </Button>
          
          {creator.bio && (
            <Button 
              variant="ghost" 
              size="sm"
              className="px-3 group-hover:bg-primary/10 group-hover:text-primary transition-colors"
              asChild
            >
              <Link to={`/creator/${creator.id}`}>
                <ExternalLink className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CreatorCard;
