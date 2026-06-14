import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import Index from "./pages/Index";
import MovieDetail from "./pages/MovieDetail";
import Browse from "./pages/Browse";
import Featured from "./pages/Featured";
import Trending from "./pages/Trending";
import Canon from "./pages/Canon";
import AllReviews from "./pages/AllReviews";
import Search from "./pages/Search";
import Movies from "./pages/Movies";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import Watchlist from "./pages/Watchlist";
import Reviews from "./pages/Reviews";
import Dashboard from "./pages/Dashboard";
import Favorites from "./pages/Favorites";
import ActivityFeed from "./pages/ActivityFeed";
import AdminPanel from "./pages/AdminPanel";
import AddMovie from "./pages/AddMovie";
import EditMovies from "./pages/EditMovies";
import EditMovie from "./pages/EditMovie";
import BulkImport from "./pages/BulkImport";
import CastCrewManagement from "./pages/CastCrewManagement";
import TrailerManagement from "./pages/TrailerManagement";
import AwardsManagement from "./pages/AwardsManagement";
import ReviewModeration from "./pages/ReviewModeration";
import UserManagement from "./pages/UserManagement";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import ContentFlagging from "./pages/ContentFlagging";
import CreatorManagement from "./pages/CreatorManagement";
import PeopleManagement from "./pages/PeopleManagement";
import Creators from "./pages/Creators";
import CreatorProfile from "./pages/CreatorProfile";
import Profiles from "./pages/Profiles";
import People from "./pages/People";
import PersonProfile from "./pages/PersonProfile";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <GoogleAnalytics />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/movie/:id" element={<MovieDetail />} />
            <Route path="/browse" element={<Browse />} />
            <Route path="/featured" element={<Featured />} />
            <Route path="/trending" element={<Trending />} />
            <Route path="/canon" element={<Canon />} />
            <Route path="/all-reviews" element={<AllReviews />} />
            <Route path="/creators" element={<Creators />} />
            <Route path="/creator/:id" element={<CreatorProfile />} />
            <Route path="/people" element={<People />} />
            <Route path="/person/:id" element={<PersonProfile />} />
            <Route path="/search" element={<Search />} />
            <Route path="/movies" element={<Movies />} />
            <Route path="/profile/:id" element={<Profile />} />
            <Route path="/profile/edit" element={
              <ProtectedRoute>
                <EditProfile />
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/watchlist" element={
              <ProtectedRoute>
                <Watchlist />
              </ProtectedRoute>
            } />
            <Route path="/reviews" element={
              <ProtectedRoute>
                <Reviews />
              </ProtectedRoute>
            } />
            <Route path="/favorites" element={
              <ProtectedRoute>
                <Favorites />
              </ProtectedRoute>
            } />
                               <Route path="/activity" element={
                     <ProtectedRoute>
                       <ActivityFeed />
                     </ProtectedRoute>
                   } />
                   <Route path="/admin" element={
                     <ProtectedRoute>
                       <AdminPanel />
                     </ProtectedRoute>
                   } />
                   <Route path="/admin/movies/add" element={
                     <ProtectedRoute>
                       <AddMovie />
                     </ProtectedRoute>
                   } />
                   <Route path="/admin/movies/edit" element={
                     <ProtectedRoute>
                       <EditMovies />
                     </ProtectedRoute>
                   } />
                   <Route path="/admin/movies/edit/:id" element={
                     <ProtectedRoute>
                       <EditMovie />
                     </ProtectedRoute>
                   } />
                   <Route path="/admin/movies/import" element={
                     <ProtectedRoute>
                       <BulkImport />
                     </ProtectedRoute>
                   } />
                   <Route path="/admin/cast-crew" element={
                     <ProtectedRoute>
                       <CastCrewManagement />
                     </ProtectedRoute>
                   } />
                   <Route path="/admin/trailers" element={
                     <ProtectedRoute>
                       <TrailerManagement />
                     </ProtectedRoute>
                   } />
                                       <Route path="/admin/awards" element={
                      <ProtectedRoute>
                        <AwardsManagement />
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/moderation" element={
                      <ProtectedRoute>
                        <ReviewModeration />
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/users" element={
                      <ProtectedRoute>
                        <UserManagement />
                      </ProtectedRoute>
                    } />
                    <Route path="/admin/analytics" element={
                      <ProtectedRoute>
                        <AnalyticsDashboard />
                      </ProtectedRoute>
                    } />
                                         <Route path="/admin/flagging" element={
                       <ProtectedRoute>
                         <ContentFlagging />
                       </ProtectedRoute>
                     } />
                     <Route path="/admin/creators" element={
                       <ProtectedRoute>
                         <CreatorManagement />
                       </ProtectedRoute>
                     } />
                     <Route path="/admin/people" element={
                       <ProtectedRoute>
                         <PeopleManagement />
                       </ProtectedRoute>
                     } />
                     <Route path="/profiles" element={<Profiles />} />
            <Route path="/auth" element={<Auth />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
