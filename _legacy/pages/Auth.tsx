import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Film, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDisplayNamePrompt, setShowDisplayNamePrompt] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [savingDisplayName, setSavingDisplayName] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check for missing display_name when user logs in
  useEffect(() => {
    const checkDisplayName = async () => {
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('user_id', user.id)
          .single();

        // Check if display_name is missing, empty, or looks like an email
        const displayName = profile?.display_name;
        const needsDisplayName = !displayName || 
          displayName.trim() === '' || 
          displayName.includes('@') ||
          displayName.startsWith('user_');

        if (needsDisplayName) {
          setShowDisplayNamePrompt(true);
        } else {
          navigate('/');
        }
      }
    };

    checkDisplayName();
  }, [user, navigate]);

  const handleSaveDisplayName = async () => {
    if (!displayNameInput.trim() || !user) return;

    setSavingDisplayName(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          display_name: displayNameInput.trim(),
        }, { onConflict: 'user_id' });

      if (error) throw error;

      toast({
        title: "Welcome!",
        description: "Your display name has been saved.",
      });
      setShowDisplayNamePrompt(false);
      navigate('/');
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to save display name. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSavingDisplayName(false);
    }
  };

  const handleSkipDisplayName = () => {
    setShowDisplayNamePrompt(false);
    navigate('/');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = isLogin 
        ? await signIn(email, password)
        : await signUp(email, password, fullName);

      if (error) {
        if (error.message.includes('User already registered')) {
          toast({
            title: "Account exists",
            description: "This email is already registered. Please sign in instead.",
            variant: "destructive"
          });
          setIsLogin(true);
        } else if (error.message.includes('Invalid login credentials')) {
          toast({
            title: "Invalid credentials",
            description: "Please check your email and password.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Authentication error",
            description: error.message,
            variant: "destructive"
          });
        }
      } else {
        if (!isLogin) {
          toast({
            title: "Account created",
            description: "Please check your email to verify your account.",
          });
        } else {
          toast({
            title: "Welcome back!",
            description: "You have successfully signed in.",
          });
          // Don't navigate here - the useEffect will handle it after checking display_name
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <Film className="w-8 h-8 text-primary" />
            <span className="text-2xl font-bold bg-hero-gradient bg-clip-text text-transparent">
              MuvieStars.com
            </span>
          </Link>
          <p className="text-muted-foreground mt-2">
            Discover the best of African cinema
          </p>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle>{isLogin ? 'Welcome Back' : 'Create Account'}</CardTitle>
            <CardDescription>
              {isLogin 
                ? 'Sign in to your account to continue' 
                : 'Join our community of African cinema lovers'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={!isLogin}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isLogin ? 'Signing in...' : 'Creating account...'}
                  </>
                ) : (
                  isLogin ? 'Sign In' : 'Sign Up'
                )}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
                <Button
                  variant="link"
                  className="p-0 ml-1 h-auto font-normal"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setFullName(''); // Clear full name when switching
                  }}
                >
                  {isLogin ? 'Sign up' : 'Sign in'}
                </Button>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary">
            ← Back to home
          </Link>
        </div>
      </div>

      {/* Display Name Prompt Dialog */}
      <Dialog open={showDisplayNamePrompt} onOpenChange={setShowDisplayNamePrompt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Your Profile</DialogTitle>
            <DialogDescription>
              Please enter your display name. This is how other users will see you in reviews and comments.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Enter your name"
                value={displayNameInput}
                onChange={(e) => setDisplayNameInput(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleSaveDisplayName} 
                disabled={!displayNameInput.trim() || savingDisplayName}
                className="flex-1"
              >
                {savingDisplayName ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save'
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleSkipDisplayName}
                disabled={savingDisplayName}
              >
                Skip for now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Auth;
