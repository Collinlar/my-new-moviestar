import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Flag, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface FlagModalProps {
  reviewId: string;
  reviewText: string;
  reviewerName: string;
  trigger?: React.ReactNode;
}

const FLAG_REASONS = [
  { value: 'spam', label: 'Spam or misleading content' },
  { value: 'inappropriate', label: 'Inappropriate or offensive content' },
  { value: 'fake', label: 'Fake or fabricated review' },
  { value: 'irrelevant', label: 'Not relevant to the movie' },
  { value: 'duplicate', label: 'Duplicate review' },
  { value: 'other', label: 'Other reason' }
];

const FlagModal = ({ reviewId, reviewText, reviewerName, trigger }: FlagModalProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [additionalDetails, setAdditionalDetails] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Flag review mutation
  const flagReviewMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      if (!flagReason) throw new Error('Please select a reason');

      const { data, error } = await supabase
        .from('review_flags')
        .insert({
          review_id: reviewId,
          user_id: user.id,
          reason: flagReason,
          details: additionalDetails.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Review flagged successfully",
        description: "Thank you for helping maintain quality. Our team will review this.",
      });
      setIsOpen(false);
      setFlagReason('');
      setAdditionalDetails('');
      queryClient.invalidateQueries({ queryKey: ['review-flags'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to flag review. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!flagReason) {
      toast({
        title: "Reason required",
        description: "Please select a reason for flagging this review.",
        variant: "destructive",
      });
      return;
    }
    flagReviewMutation.mutate();
  };

  if (!user) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="ghost" size="sm">
              <Flag className="h-4 w-4 mr-2" />
              Sign in to Flag
            </Button>
          )}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign in to Flag Review</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              You need to be signed in to flag reviews.
            </p>
            <Button asChild>
              <a href="/auth">Sign In</a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <Flag className="h-4 w-4 mr-2" />
            Flag Review
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            Flag Review
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Review Preview */}
          <div className="bg-muted/30 rounded-lg p-4">
            <h4 className="font-semibold mb-2 text-sm">Review by {reviewerName}</h4>
            <p className="text-muted-foreground text-sm line-clamp-3">{reviewText}</p>
          </div>

          {/* Flag Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reason" className="block text-sm font-medium mb-2">
                Reason for Flagging
              </label>
              <Select value={flagReason} onValueChange={setFlagReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {FLAG_REASONS.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="details" className="block text-sm font-medium mb-2">
                Additional Details (Optional)
              </label>
              <Textarea
                id="details"
                placeholder="Provide more context about why you're flagging this review..."
                value={additionalDetails}
                onChange={(e) => setAdditionalDetails(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                variant="destructive"
                disabled={flagReviewMutation.isPending || !flagReason}
              >
                {flagReviewMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Flagging...
                  </>
                ) : (
                  <>
                    <Flag className="h-4 w-4 mr-2" />
                    Flag Review
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                Please only flag reviews that violate our community guidelines. 
                False reports may result in account restrictions.
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FlagModal;
