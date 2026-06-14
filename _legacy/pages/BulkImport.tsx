import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Navigation } from '@/components/Navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Upload, 
  FileText, 
  ArrowLeft,
  Download,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { pingSitemap } from '@/services/searchEngineNotification';

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
  movieIds?: string[];
}

const BulkImport = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);

  // Check if user is admin
  const isAdmin = user?.email === 'kofcollkcl100@gmail.com';

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-muted-foreground">Access Denied</h2>
              <p className="mt-2 text-muted-foreground">You don't have permission to import movies.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      parseCSV(selectedFile);
    } else if (selectedFile) {
      toast({
        title: "Invalid file type",
        description: "Please select a CSV file",
        variant: "destructive",
      });
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      const data = lines.slice(1, 6).filter(line => line.trim()).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });
      
      setPreviewData(data);
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const template = `title,description,release_year,genre,language,duration,poster_url,youtube_url,director,producer,writer,budget,box_office,country,rating,synopsis,tagline,keywords
"Movie Title","Movie description here",2024,action,english,120,"https://example.com/poster.jpg","https://youtube.com/watch?v=...","Director Name","Producer Name","Writer Name",1000000,50000000,"USA","PG-13","Detailed plot summary","Movie tagline","action,adventure,thriller"`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'movie_import_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const bulkImportMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('No file selected');
      
      setIsLoading(true);
      
      try {
        const text = await file.text();
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        const movies = lines.slice(1).filter(line => line.trim()).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const movie: any = {};
          headers.forEach((header, index) => {
            let value: any = values[index] || '';
            
            // Convert numeric fields
            if (['release_year', 'duration', 'budget', 'box_office'].includes(header)) {
              movie[header] = value ? parseFloat(value) : 0;
            }
            // Convert boolean fields
            else if (['featured', 'is_featured'].includes(header)) {
              movie[header] = value === 'true' || value === true;
            }
            // Keep as string for other fields
            else {
              movie[header] = value;
            }
          });
          
          // Set default values
          movie.average_rating = 0;
          movie.review_count = 0;
          
          return movie;
        });

        const results = {
          success: 0,
          failed: 0,
          errors: [] as string[],
          movieIds: [] as string[]
        };

        for (let i = 0; i < movies.length; i++) {
          try {
            const { data, error } = await supabase
              .from('movies')
              .insert([movies[i]])
              .select('id')
              .single();
            
            if (error) {
              results.failed++;
              results.errors.push(`Row ${i + 2}: ${error.message}`);
            } else {
              results.success++;
              if (data?.id) {
                results.movieIds.push(data.id);
              }
            }
          } catch (error: any) {
            results.failed++;
            results.errors.push(`Row ${i + 2}: ${error.message}`);
          }
        }

        return results;
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: async (results: ImportResult) => {
      setImportResult(results);
      toast({
        title: "Import completed",
        description: `Successfully imported ${results.success} movies. ${results.failed} failed.`,
        variant: results.failed > 0 ? "destructive" : "default",
      });
      queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
      queryClient.invalidateQueries({ queryKey: ['movies'] });
      
      // Notify search engines about bulk import
      if (results.success > 0) {
        console.log(`📢 Notifying search engines about ${results.success} imported movies`);
        pingSitemap().then(result => {
          if (result.success) {
            console.log('✅ Search engines notified about sitemap update');
          } else {
            console.warn('⚠️ Sitemap notification failed:', result.message);
          }
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Import failed",
        description: error.message || "Failed to import movies",
        variant: "destructive",
      });
    },
  });

  const handleImport = () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to import",
        variant: "destructive",
      });
      return;
    }
    
    bulkImportMutation.mutate();
  };

  const resetForm = () => {
    setFile(null);
    setPreviewData([]);
    setImportResult(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Bulk Import Movies</h1>
              <p className="text-muted-foreground">Import multiple movies from a CSV file</p>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Import Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2">Required Fields:</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• title (required)</li>
                  <li>• description (required)</li>
                  <li>• release_year (required)</li>
                  <li>• genre (required)</li>
                  <li>• language (required)</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Optional Fields:</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• duration, poster_url, youtube_url</li>
                  <li>• director, producer, writer</li>
                  <li>• budget, box_office, country</li>
                  <li>• rating, synopsis, tagline, keywords</li>
                </ul>
              </div>
            </div>
            
            <div className="flex gap-4">
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload CSV File
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="csv-file">Select CSV File</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
              <p className="text-sm text-muted-foreground">
                Maximum file size: 10MB. Only CSV files are supported.
              </p>
            </div>

            {file && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="font-medium">File selected: {file.name}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Size: {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}

            {/* Preview Data */}
            {previewData.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3">Preview (First 5 rows):</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse border border-border">
                    <thead>
                      <tr className="bg-muted">
                        {Object.keys(previewData[0] || {}).map((header) => (
                          <th key={header} className="border border-border p-2 text-left">
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, index) => (
                        <tr key={index}>
                          {Object.values(row).map((value, cellIndex) => (
                            <td key={cellIndex} className="border border-border p-2">
                              {String(value || '').substring(0, 50)}
                              {String(value || '').length > 50 ? '...' : ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Import Button */}
            {file && (
              <div className="flex gap-4">
                <Button 
                  onClick={handleImport} 
                  disabled={isLoading}
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isLoading ? 'Importing...' : 'Start Import'}
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Import Results */}
        {importResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {importResult.failed === 0 ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                )}
                Import Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{importResult.success}</div>
                  <div className="text-sm text-green-700">Successfully Imported</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{importResult.failed}</div>
                  <div className="text-sm text-red-700">Failed to Import</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{importResult.success + importResult.failed}</div>
                  <div className="text-sm text-blue-700">Total Processed</div>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Errors:</h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {importResult.errors.map((error, index) => (
                      <div key={index} className="text-sm text-red-600 p-2 bg-red-50 rounded">
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <Button onClick={resetForm}>
                  Import Another File
                </Button>
                <Link to="/admin">
                  <Button variant="outline">
                    Back to Admin Panel
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BulkImport;
