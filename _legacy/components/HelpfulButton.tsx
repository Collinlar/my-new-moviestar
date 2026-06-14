import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ThumbsUp, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface HelpfulButtonProps {
  reviewId: string;
  initialCount: number;
  size?: 'sm' | 'default';
  variant?: 'ghost' | 'outline' | 'default';
}

const HelpfulButton = ({ reviewId, initialCount, size = 'sm', variant = 'ghost' }: HelpfulButtonProps) => {
  const [isVoted, setIsVoted] = useState(false);
  const [voteCount, setVoteCount] = useState(initialCount);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check if user has already voted
  useEffect(() => {
    if (!user) return;

    const checkVoteStatus = async () => {
      const { data } = await supabase
        .from('helpful_votes')
        .select('id')
        .eq('review_id', reviewId)
        .eq('user_id', user.id)
        .maybeSingle();

      setIsVoted(!!data);
    };

    checkVoteStatus();
  }, [user, reviewId]);

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      if (isVoted) {
        // Remove vote
        const { error } = await supabase
          .from('helpful_votes')
          .delete()
          .eq('review_id', reviewId)
          .eq('user_id', user.id);

        if (error) throw error;
        return { action: 'remove' };
      } else {
        // Add vote
        const { error } = await supabase
          .from('helpful_votes')
          .insert({
            review_id: reviewId,
            user_id: user.id,
          });

        if (error) throw error;
        return { action: 'add' };
      }
    },
    onSuccess: (result) => {
      if (result.action === 'add') {
        setIsVoted(true);
        setVoteCount(prev => prev + 1);
        toast({
          title: "Vote added!",
          description: "Your helpful vote has been recorded.",
        });
      } else {
        setIsVoted(false);
        setVoteCount(prev => prev - 1);
        toast({
          title: "Vote removed!",
          description: "Your helpful vote has been removed.",
        });
      }

      // Invalidate related queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['movie-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['top-reviews'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update vote. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleVote = () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "You need to be signed in to vote on reviews.",
        variant: "destructive",
      });
      return;
    }

    voteMutation.mutate();
  };

  return (
    <Button
      variant={isVoted ? 'default' : variant}
      size={size}
      onClick={handleVote}
      disabled={voteMutation.isPending}
      className={`transition-all duration-200 ${
        isVoted 
          ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
          : 'hover:bg-muted'
      }`}
    >
      {voteMutation.isPending ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <ThumbsUp className={`h-4 w-4 mr-2 ${isVoted ? 'fill-current' : ''}`} />
      )}
      {isVoted ? 'Voted' : 'Helpful'} {voteCount > 0 && `(${voteCount})`}
    </Button>
  );
};

export default HelpfulButton;
