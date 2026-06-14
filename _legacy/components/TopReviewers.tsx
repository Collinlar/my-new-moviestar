import { Trophy, MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { getSafeDisplayName } from "@/lib/displayName";

interface TopReviewer {
  user_id: string;
  review_count: number;
  total_helpful: number;
  profile: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  } | null;
}

const TopReviewers = () => {
  const { data: topReviewers, isLoading } = useQuery({
    queryKey: ['top-reviewers'],
    queryFn: async () => {
      const { data: reviewStats, error: statsError } = await supabase
        .from('reviews')
        .select('user_id, rating, helpful_count')
        .order('created_at', { ascending: false });

      if (statsError) throw statsError;

      const userStats = reviewStats?.reduce((acc, review) => {
        if (!acc[review.user_id]) {
          acc[review.user_id] = {
            user_id: review.user_id,
            review_count: 0,
            total_helpful: 0,
          };
        }
        acc[review.user_id].review_count += 1;
        acc[review.user_id].total_helpful += review.helpful_count || 0;
        return acc;
      }, {} as Record<string, { user_id: string; review_count: number; total_helpful: number }>);

      const sortedUsers = Object.values(userStats || {})
        .sort((a, b) => b.review_count - a.review_count)
        .slice(0, 3);

      const userIds = sortedUsers.map(u => u.user_id);
      
      if (userIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url, username')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      const profileMap = (profiles || []).reduce((acc, profile) => {
        acc[profile.user_id] = profile;
        return acc;
      }, {} as Record<string, typeof profiles[0]>);

      return sortedUsers.map(user => ({
        user_id: user.user_id,
        review_count: user.review_count,
        total_helpful: user.total_helpful,
        profile: profileMap[user.user_id] || null,
      })) as TopReviewer[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return { ring: 'ring-yellow-400', bg: 'bg-yellow-400', text: 'text-yellow-950' };
      case 2:
        return { ring: 'ring-gray-400', bg: 'bg-gray-400', text: 'text-gray-950' };
      case 3:
        return { ring: 'ring-amber-600', bg: 'bg-amber-600', text: 'text-amber-950' };
      default:
        return { ring: 'ring-border', bg: 'bg-muted', text: 'text-muted-foreground' };
    }
  };

  if (isLoading) {
    return (
      <section className="py-12 bg-background">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <Skeleton className="h-7 w-64 mx-auto mb-2" />
            <Skeleton className="h-4 w-48 mx-auto" />
          </div>
          <div className="flex justify-center gap-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <Skeleton className="h-16 w-16 rounded-full mb-2" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (!topReviewers || topReviewers.length === 0) {
    return (
      <section className="py-12 bg-background">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <MessageSquare className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No reviewers yet. Be the first!</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 bg-background">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className="w-6 h-6 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Top Contributors</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Voices shaping how African cinema is remembered
          </p>
        </div>

        {/* Contributors Row */}
        <div className="flex justify-center items-end gap-6 md:gap-12">
          {topReviewers.map((reviewer, index) => {
            const rankStyle = getRankStyle(index + 1);
            const displayName = getSafeDisplayName(reviewer.profile?.display_name, reviewer.profile?.username);
            
            return (
              <Link 
                key={reviewer.user_id} 
                to={`/profile/${reviewer.user_id}`}
                className="group flex flex-col items-center text-center"
              >
                {/* Avatar with rank badge */}
                <div className="relative mb-3">
                  <Avatar className={`w-16 h-16 ring-2 ${rankStyle.ring} group-hover:scale-105 transition-transform`}>
                    <AvatarImage src={reviewer.profile?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {/* Rank badge */}
                  <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full ${rankStyle.bg} ${rankStyle.text} flex items-center justify-center text-xs font-bold shadow-sm`}>
                    {index + 1}
                  </div>
                </div>
                
                {/* Name */}
                <h3 className="font-medium text-foreground text-sm truncate max-w-[100px] group-hover:text-primary transition-colors">
                  {displayName}
                </h3>
                
                {/* Review count only */}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {reviewer.review_count} {reviewer.review_count === 1 ? 'review' : 'reviews'}
                </p>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default TopReviewers;
