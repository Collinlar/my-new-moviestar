import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface SearchBarProps {
  placeholder?: string;
  initialValue?: string;
  onSearch?: (query: string) => void;
  className?: string;
  autoFocus?: boolean;
}

const SearchBar = ({ 
  placeholder = "Search movies, actors, directors, creators...", 
  initialValue = "",
  onSearch,
  className = "",
  autoFocus = false
}: SearchBarProps) => {
  const [searchQuery, setSearchQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    // If a suggestion is selected, use it
    if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
      const selectedSuggestion = suggestions[selectedSuggestionIndex];
      setSearchQuery(selectedSuggestion);
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
      if (onSearch) {
        onSearch(selectedSuggestion);
      } else {
        navigate(`/search?q=${encodeURIComponent(selectedSuggestion)}`);
      }
      return;
    }
    
    // Otherwise use the current search query
    if (searchQuery.trim()) {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
      if (onSearch) {
        onSearch(searchQuery.trim());
      } else {
        navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > -1 ? prev - 1 : -1);
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setShowSuggestions(false);
    if (onSearch) {
      onSearch("");
    }
  };

  // Fetch search suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.length >= 2) {
        try {
          const suggestionSet = new Set<string>();

          // Search in movie fields
          const { data: movieData } = await supabase
            .from('movies')
            .select('title, director, producer, writer')
            .or(`title.ilike.%${searchQuery}%,director.ilike.%${searchQuery}%,producer.ilike.%${searchQuery}%,writer.ilike.%${searchQuery}%`)
            .limit(3);

          if (movieData) {
            movieData.forEach(movie => {
              if (movie.title?.toLowerCase().includes(searchQuery.toLowerCase())) {
                suggestionSet.add(movie.title);
              }
              if (movie.director?.toLowerCase().includes(searchQuery.toLowerCase())) {
                suggestionSet.add(movie.director);
              }
              if (movie.producer?.toLowerCase().includes(searchQuery.toLowerCase())) {
                suggestionSet.add(movie.producer);
              }
              if (movie.writer?.toLowerCase().includes(searchQuery.toLowerCase())) {
                suggestionSet.add(movie.writer);
              }
            });
          }

          // Search in cast
          const { data: castData } = await supabase
            .from('movie_cast')
            .select('name')
            .ilike('name', `%${searchQuery}%`)
            .limit(2);

          if (castData) {
            castData.forEach(cast => {
              if (cast.name) {
                suggestionSet.add(cast.name);
              }
            });
          }

          // Search in creators
          const { data: creatorData } = await supabase
            .from('creators')
            .select('name')
            .ilike('name', `%${searchQuery}%`)
            .limit(2);

          if (creatorData) {
            creatorData.forEach(creator => {
              if (creator.name) {
                suggestionSet.add(creator.name);
              }
            });
          }

          setSuggestions(Array.from(suggestionSet).slice(0, 5));
          setShowSuggestions(true);
        } catch (error) {
          console.error('Error fetching suggestions:', error);
        }
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  // Handle clicking outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    if (onSearch) {
      onSearch(suggestion);
    } else {
      navigate(`/search?q=${encodeURIComponent(suggestion)}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className={`relative ${className}`}>
      <div className="relative">
        <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground ${
          className?.includes('hero-search') ? 'left-4 w-5 h-5' : ''
        }`} />
        <Input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setSelectedSuggestionIndex(-1);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => searchQuery.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
          className={`pl-10 pr-10 bg-background border-border focus:border-primary ${
            className?.includes('hero-search') ? 'pl-12 pr-24 py-4 text-lg bg-white/95 backdrop-blur-sm border-0 shadow-lg' : ''
          }`}
          autoFocus={autoFocus}
        />
        {/* Hero Search Button or Clear Button */}
        {className?.includes('hero-search') ? (
          <Button 
            type="submit"
            size="lg"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-primary hover:bg-primary/90"
          >
            Search
          </Button>
        ) : searchQuery && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Search Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div 
          ref={suggestionsRef}
          className={`absolute top-full left-0 right-0 mt-1 border rounded-md shadow-lg z-50 max-h-60 overflow-y-auto ${
            className?.includes('hero-search') ? 'bg-white border-gray-200' : 'bg-background border-border'
          }`}
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className={`w-full text-left px-4 py-2 hover:bg-muted transition-colors text-sm border-b border-border last:border-b-0 ${
                selectedSuggestionIndex === index ? 'bg-muted' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <Search className="h-3 w-3 text-muted-foreground" />
                <span>{suggestion}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </form>
  );
};

export default SearchBar;