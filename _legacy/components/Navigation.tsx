import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogOut, TrendingUp, Heart, Star, Activity, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import SearchBar from '@/components/SearchBar';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import logo from '@/assets/muviestars-logo.png';

export const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  // Fetch user profile to check admin role
  const { data: profile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error) return null;
      return data;
    },
    enabled: !!user,
  });

  // Check if user is admin
  const isAdmin = profile?.role === 'admin' || user?.email === 'kofcollkcl100@gmail.com';

  const handleSearch = (query: string) => {
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50 backdrop-blur-sm bg-card/95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img 
              src={logo} 
              alt="MuvieStars" 
              className="h-10 w-auto object-contain"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-foreground hover:text-primary transition-colors font-medium">
              Home
            </Link>
            <Link to="/browse" className="text-muted-foreground hover:text-primary transition-colors">
              Browse
            </Link>
            <Link to="/people" className="text-muted-foreground hover:text-primary transition-colors">
              People & Talent
            </Link>
            <Link to="/movies" className="text-muted-foreground hover:text-primary transition-colors">
              African Movie Database
            </Link>
          </div>

          {/* Search Bar */}
          <div className="hidden sm:flex items-center max-w-xs w-full">
            <SearchBar onSearch={handleSearch} placeholder="Search movies, actors..." />
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={profile?.avatar_url || user.user_metadata?.avatar_url} alt={profile?.display_name || user.email || 'User'} />
                        <AvatarFallback>
                          {(profile?.display_name || user.email || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-medium">{profile?.display_name || user.user_metadata?.full_name || 'User'}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/profile/${user.id}`)}>
                      <User className="mr-2 h-4 w-4" />
                      My Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/profile/edit')}>
                      <User className="mr-2 h-4 w-4" />
                      Edit Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/watchlist')}>
                      <Heart className="mr-2 h-4 w-4" />
                      My Watchlist
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/favorites')}>
                      <Heart className="mr-2 h-4 w-4" />
                      My Favorites
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/reviews')}>
                      <Star className="mr-2 h-4 w-4" />
                      My Reviews
                    </DropdownMenuItem>
                                       <DropdownMenuItem onClick={() => navigate('/activity')}>
                     <Activity className="mr-2 h-4 w-4" />
                     Activity Feed
                   </DropdownMenuItem>
                   {isAdmin && (
                     <DropdownMenuItem onClick={() => navigate('/admin')}>
                       <Shield className="mr-2 h-4 w-4" />
                       Admin Panel
                     </DropdownMenuItem>
                   )}
                    <DropdownMenuItem onClick={() => navigate('/profiles')}>
                      <User className="mr-2 h-4 w-4" />
                      Community
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={() => navigate('/auth')}>
                  Sign In
                </Button>
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => navigate('/auth')}>
                  Sign Up
                </Button>
              </>
            )}
            
            {/* Mobile menu button */}
            <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-sm">
            <div className="py-4 space-y-4">
              <div className="px-2">
                <SearchBar onSearch={handleSearch} placeholder="Search movies, actors..." />
              </div>
              <div className="space-y-2">
                <Link to="/" className="block px-2 py-2 text-foreground hover:text-primary hover:bg-muted rounded-md transition-colors" onClick={() => setIsMenuOpen(false)}>
                  Home
                </Link>
                <Link to="/browse" className="block px-2 py-2 text-foreground hover:text-primary hover:bg-muted rounded-md transition-colors" onClick={() => setIsMenuOpen(false)}>
                  Browse Movies
                </Link>
                <Link to="/people" className="block px-2 py-2 text-foreground hover:text-primary hover:bg-muted rounded-md transition-colors" onClick={() => setIsMenuOpen(false)}>
                  People & Talent
                </Link>
                <Link to="/movies" className="block px-2 py-2 text-foreground hover:text-primary hover:bg-muted rounded-md transition-colors" onClick={() => setIsMenuOpen(false)}>
                  African Movie Database
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};