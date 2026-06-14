import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, Plus, Check, Loader2, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';

interface WatchlistButtonProps {
  movieId: string;
  movieTitle?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
  showText?: boolean;
}

export const WatchlistButton = ({ 
  movieId, 
  movieTitle,
  variant = 'outline', 
  size = 'default',
  showText = true 
}: WatchlistButtonProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const [showReviewPrompt, setShowReviewPrompt] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState('');

  // Check if movie is in user's watchlist
  const { data: watchlistItem, isLoading } = useQuery({
    queryKey: ['watchlist-item', movieId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('watchlists')
        .select('*')
        .eq('user_id', user.id)
        .eq('movie_id', movieId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Check if user has already reviewed this movie
  const { data: existingReview } = useQuery({
    queryKey: ['user-review', movieId, user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('reviews')
        .select('id')
        .eq('user_id', user.id)
        .eq('movie_id', movieId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await supabase
        .from('reviews')
        .insert({
          user_id: user.id,
          movie_id: movieId,
          rating,
          review_text: reviewText || null,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Review submitted!",
        description: "Thank you for sharing your thoughts",
      });
      setShowReviewPrompt(false);
      setRating(0);
      setReviewText('');
      queryClient.invalidateQueries({ queryKey: ['reviews', movieId] });
      queryClient.invalidateQueries({ queryKey: ['user-review', movieId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['top-reviewers'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit review",
        variant: "destructive",
      });
    },
  });

  const toggleWatchlistMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      if (watchlistItem) {
        // Remove from watchlist
        const { error } = await supabase
          .from('watchlists')
          .delete()
          .eq('id', watchlistItem.id);
        
        if (error) throw error;
        return { action: 'removed' };
      } else {
        // Add to watchlist
        const { error } = await supabase
          .from('watchlists')
          .insert({
            user_id: user.id,
            movie_id: movieId,
            is_favorite: false,
          });
        
        if (error) throw error;
        return { action: 'added' };
      }
    },
    onSuccess: (data) => {
      toast({
        title: data.action === 'added' ? "Added to Watchlist" : "Removed from Watchlist",
        description: data.action === 'added' 
          ? "Movie has been added to your watchlist" 
          : "Movie has been removed from your watchlist",
      });
      
      // Invalidate queries to refresh UI
      queryClient.invalidateQueries({ queryKey: ['watchlist-item', movieId, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['user-watchlist', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });

      // Show review prompt if added and user hasn't reviewed yet
      if (data.action === 'added' && !existingReview) {
        setShowReviewPrompt(true);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update watchlist",
        variant: "destructive",
      });
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (!user || !watchlistItem) throw new Error('Movie not in watchlist');

      const { error } = await supabase
        .from('watchlists')
        .update({ is_favorite: !watchlistItem.is_favorite })
        .eq('id', watchlistItem.id);
      
      if (error) throw error;
      return { isFavorite: !watchlistItem.is_favorite };
    },
    onSuccess: (data) => {
      toast({
        title: data.isFavorite ? "Added to Favorites" : "Removed from Favorites",
        description: data.isFavorite 
          ? "Movie marked as favorite" 
          : "Movie removed from favorites",
      });
      
      queryClient.invalidateQueries({ queryKey: ['watchlist-item', movieId, user?.id] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update favorite status",
        variant: "destructive",
      });
    },
  });

  if (!user) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={() => window.location.href = '/auth'}
        className="gap-2"
      >
        <Plus className="h-4 w-4" />
        {showText && "Add to Watchlist"}
      </Button>
    );
  }

  const isInWatchlist = !!watchlistItem;
  const isFavorite = watchlistItem?.is_favorite || false;
  const isUpdating = toggleWatchlistMutation.isPending || toggleFavoriteMutation.isPending;

  return (
    <div className="flex gap-2">
      <Button
        variant={isInWatchlist ? 'default' : variant}
        size={size}
        onClick={() => toggleWatchlistMutation.mutate()}
        disabled={isUpdating || isLoading}
        className="gap-2"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {isUpdating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isInWatchlist ? (
          <Check className="h-4 w-4" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        {showText && (
          isInWatchlist 
            ? (isHovered ? "Remove from Watchlist" : "In Watchlist")
            : "Add to Watchlist"
        )}
      </Button>

      {isInWatchlist && (
        <Button
          variant={isFavorite ? 'default' : 'outline'}
          size={size}
          onClick={() => toggleFavoriteMutation.mutate()}
          disabled={isUpdating}
          className="gap-2"
        >
          <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
          {showText && size !== 'sm' && (isFavorite ? "Favorited" : "Favorite")}
        </Button>
      )}

      {/* Review Prompt Dialog */}
      <Dialog open={showReviewPrompt} onOpenChange={setShowReviewPrompt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              Rate this movie?
            </DialogTitle>
            <DialogDescription>
              {movieTitle ? `Share your thoughts on "${movieTitle}"` : "Share your thoughts on this movie"}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Star Rating */}
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? 'text-yellow-500 fill-yellow-500'
                        : 'text-muted-foreground'
                    }`}
                  />
                </button>
              ))}
            </div>
            
            {/* Optional Review Text */}
            <Textarea
              placeholder="Write a quick review (optional)..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              onClick={() => setShowReviewPrompt(false)}
            >
              Maybe Later
            </Button>
            <Button
              onClick={() => submitReviewMutation.mutate()}
              disabled={rating === 0 || submitReviewMutation.isPending}
            >
              {submitReviewMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Submit Review
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};