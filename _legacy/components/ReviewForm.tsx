import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Star, Loader2, BookOpen, Globe2, Film, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ReviewFormProps {
  movieId: string;
  onReviewAdded?: () => void;
}

interface DimensionalRating {
  label: string;
  key: 'story' | 'cultural' | 'production' | 'rewatch';
  icon: React.ReactNode;
  description: string;
}

const DIMENSIONAL_RATINGS: DimensionalRating[] = [
  { label: 'Story', key: 'story', icon: <BookOpen className="w-4 h-4" />, description: 'Narrative quality' },
  { label: 'Cultural', key: 'cultural', icon: <Globe2 className="w-4 h-4" />, description: 'Authenticity & representation' },
  { label: 'Production', key: 'production', icon: <Film className="w-4 h-4" />, description: 'Visual & audio quality' },
  { label: 'Rewatch', key: 'rewatch', icon: <RotateCcw className="w-4 h-4" />, description: 'Would watch again?' },
];

const StarRating = ({ 
  value, 
  onChange, 
  size = 'md' 
}: { 
  value: number; 
  onChange: (v: number) => void; 
  size?: 'sm' | 'md';
}) => {
  const [hovered, setHovered] = useState(0);
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';
  
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="p-0.5 hover:scale-110 transition-transform"
        >
          <Star
            className={`${iconSize} ${
              star <= (hovered || value)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground'
            }`}
          />
        </button>
      ))}
    </div>
  );
};

export const ReviewForm = ({ movieId, onReviewAdded }: ReviewFormProps) => {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dimensionalRatings, setDimensionalRatings] = useState({
    story: 0,
    cultural: 0,
    production: 0,
    rewatch: 0,
  });
  
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createReviewMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const reviewData: any = {
        movie_id: movieId,
        user_id: user.id,
        rating,
        review_text: reviewText || null,
        review_type: 'audience',
      };

      // Add dimensional ratings if provided
      if (dimensionalRatings.story > 0) reviewData.story_rating = dimensionalRatings.story;
      if (dimensionalRatings.cultural > 0) reviewData.cultural_rating = dimensionalRatings.cultural;
      if (dimensionalRatings.production > 0) reviewData.production_rating = dimensionalRatings.production;
      if (dimensionalRatings.rewatch > 0) reviewData.rewatch_rating = dimensionalRatings.rewatch;

      const { data, error } = await supabase
        .from('reviews')
        .insert(reviewData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Review added!",
        description: "Your review has been posted successfully.",
      });
      setRating(0);
      setReviewText('');
      setDimensionalRatings({ story: 0, cultural: 0, production: 0, rewatch: 0 });
      setShowAdvanced(false);
      onReviewAdded?.();
      queryClient.invalidateQueries({ queryKey: ['movie'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to post review. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      toast({
        title: "Rating required",
        description: "Please select an overall rating before submitting.",
        variant: "destructive",
      });
      return;
    }
    createReviewMutation.mutate();
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            <a href="/auth" className="text-primary hover:underline">Sign in</a> to write a review
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Write a Review</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Overall Star Rating */}
          <div>
            <Label className="mb-2 block">Overall Rating *</Label>
            <StarRating value={rating} onChange={setRating} />
          </div>

          {/* Advanced Dimensional Ratings */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button type="button" variant="ghost" size="sm" className="text-muted-foreground">
                {showAdvanced ? '− Hide' : '+ Add'} detailed ratings (optional)
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-3">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                {DIMENSIONAL_RATINGS.map((dim) => (
                  <div key={dim.key} className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      {dim.icon}
                      <Label className="text-sm">{dim.label}</Label>
                    </div>
                    <StarRating 
                      value={dimensionalRatings[dim.key]} 
                      onChange={(v) => setDimensionalRatings(prev => ({ ...prev, [dim.key]: v }))}
                      size="sm"
                    />
                    <p className="text-xs text-muted-foreground">{dim.description}</p>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Review Text */}
          <div>
            <Label className="mb-2 block">Review (Optional)</Label>
            <Textarea
              placeholder="Share your thoughts about this movie..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              rows={4}
            />
          </div>

          <Button 
            type="submit" 
            disabled={createReviewMutation.isPending || rating === 0}
            className="w-full"
          >
            {createReviewMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Posting Review...
              </>
            ) : (
              'Post Review'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
