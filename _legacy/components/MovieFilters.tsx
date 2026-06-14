import { useState } from 'react';
import { Filter, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface MovieFiltersProps {
  onFiltersChange: (filters: {
    genre?: string;
    language?: string;
    yearFrom?: number;
    yearTo?: number;
    sortBy?: 'title' | 'release_year' | 'average_rating' | 'created_at';
    sortOrder?: 'asc' | 'desc';
  }) => void;
  initialFilters?: {
    genre?: string;
    language?: string;
    yearFrom?: number;
    yearTo?: number;
    sortBy?: 'title' | 'release_year' | 'average_rating' | 'created_at';
    sortOrder?: 'asc' | 'desc';
  };
}

const MovieFilters = ({ onFiltersChange, initialFilters = {} }: MovieFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState(initialFilters);

  const genres = [
    { value: 'action', label: 'Action' },
    { value: 'adventure', label: 'Adventure' },
    { value: 'comedy', label: 'Comedy' },
    { value: 'drama', label: 'Drama' },
    { value: 'family', label: 'Family' },
    { value: 'horror', label: 'Horror' },
    { value: 'musical', label: 'Musical' },
    { value: 'romance', label: 'Romance' },
    { value: 'thriller', label: 'Thriller' },
    { value: 'documentary', label: 'Documentary' },
    { value: 'historical', label: 'Historical' }
  ];

  const languages = [
    { value: 'english', label: 'English' },
    { value: 'yoruba', label: 'Yoruba' },
    { value: 'igbo', label: 'Igbo' },
    { value: 'hausa', label: 'Hausa' },
    { value: 'twi', label: 'Twi' },
    { value: 'french', label: 'French' },
    { value: 'swahili', label: 'Swahili' },
    { value: 'other', label: 'Other' }
  ];

  const sortOptions = [
    { value: 'created_at-desc', label: 'Newest First' },
    { value: 'created_at-asc', label: 'Oldest First' },
    { value: 'title-asc', label: 'Title A-Z' },
    { value: 'title-desc', label: 'Title Z-A' },
    { value: 'release_year-desc', label: 'Release Year (Newest)' },
    { value: 'release_year-asc', label: 'Release Year (Oldest)' },
    { value: 'average_rating-desc', label: 'Highest Rated' },
    { value: 'average_rating-asc', label: 'Lowest Rated' }
  ];

  const updateFilter = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {};
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    value !== undefined && value !== '' && value !== null
  );

  return (
    <Card className="border-primary/10">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
                {hasActiveFilters && (
                  <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                    Active
                  </span>
                )}
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Sort By */}
            <div className="space-y-2">
              <Label>Sort By</Label>
              <Select
                value={filters.sortBy && filters.sortOrder ? `${filters.sortBy}-${filters.sortOrder}` : ''}
                onValueChange={(value) => {
                  if (value) {
                    const [sortBy, sortOrder] = value.split('-');
                    updateFilter('sortBy', sortBy as 'title' | 'release_year' | 'average_rating' | 'created_at');
                    updateFilter('sortOrder', sortOrder as 'asc' | 'desc');
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose sorting" />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Genre Filter */}
            <div className="space-y-2">
              <Label>Genre</Label>
              <Select
                value={filters.genre || ''}
                onValueChange={(value) => updateFilter('genre', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All genres" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All genres</SelectItem>
                  {genres.map((genre) => (
                    <SelectItem key={genre.value} value={genre.value}>
                      {genre.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Language Filter */}
            <div className="space-y-2">
              <Label>Language</Label>
              <Select
                value={filters.language || ''}
                onValueChange={(value) => updateFilter('language', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All languages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All languages</SelectItem>
                  {languages.map((language) => (
                    <SelectItem key={language.value} value={language.value}>
                      {language.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Year Range */}
            <div className="space-y-2">
              <Label>Release Year</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="From"
                  min="1990"
                  max={new Date().getFullYear()}
                  value={filters.yearFrom || ''}
                  onChange={(e) => updateFilter('yearFrom', e.target.value ? parseInt(e.target.value) : undefined)}
                />
                <Input
                  type="number"
                  placeholder="To"
                  min="1990"
                  max={new Date().getFullYear()}
                  value={filters.yearTo || ''}
                  onChange={(e) => updateFilter('yearTo', e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters} className="w-full">
                <X className="h-4 w-4 mr-2" />
                Clear All Filters
              </Button>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default MovieFilters;