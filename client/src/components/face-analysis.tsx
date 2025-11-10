import { useState, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useFaceApi } from '@/hooks/use-face-api';
import { FaceDetectionResult, AnalysisStats, type FaceAnalysis as FaceAnalysisType } from '@shared/schema';
import { calculateAnalysisStats, getConfidenceLevel, getConfidenceLevelColor, drawFaceOverlays, downloadResults } from '@/lib/face-api-utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Upload, 
  Image as ImageIcon, 
  Users, 
  BarChart, 
  Download, 
  RefreshCw, 
  Share, 
  User,
  Clock,
  MemoryStick,
  Zap,
  ShieldCheck,
  KeyRound,
  Trash2,
  Lock,
  CheckCircle,
  Cog,
  History
} from 'lucide-react';

export default function FaceAnalysis() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [detectedFaces, setDetectedFaces] = useState<FaceDetectionResult[]>([]);
  const [analysisStats, setAnalysisStats] = useState<AnalysisStats | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [imageName, setImageName] = useState<string>('');
  // history UI removed per request

  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { isLoaded, isLoading, error, detectFaces } = useFaceApi();
  const { toast } = useToast();

  // history handling removed

  const saveAnalysisMutation = useMutation({
    mutationFn: async (data: { imageFileName: string; imageDimensions: { width: number; height: number }; detectedFaces: FaceDetectionResult[]; processingTime?: string }) => {
      const res = await apiRequest('POST', '/api/analyses', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/analyses'] });
      toast({
        title: "Analysis saved",
        description: "Your face analysis has been saved to history."
      });
    }
  });

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a valid image file (JPG, PNG, WebP).",
        variant: "destructive"
      });
      return;
    }

    setImageName(file.name);
    
    const imageUrl = URL.createObjectURL(file);
    setUploadedImage(imageUrl);
    
    // Reset previous results
    setDetectedFaces([]);
    setAnalysisStats(null);
    setAnalysisProgress(0);

    // Load image to get dimensions
    const img = new Image();
    img.onload = () => {
      setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      analyzeImage(img);
    };
    img.src = imageUrl;
  }, [detectFaces, toast]);

  const analyzeImage = async (image: HTMLImageElement) => {
    if (!isLoaded) {
      toast({
        title: "Models not ready",
        description: "Face detection models are still loading. Please wait.",
        variant: "destructive"
      });
      return;
    }

    setIsAnalyzing(true);
    setAnalysisProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const startTime = Date.now();
      const faces = await detectFaces(image);
      const endTime = Date.now();
      
      clearInterval(progressInterval);
      setAnalysisProgress(100);

      setDetectedFaces(faces);

      // Use the provided image dimensions if available, otherwise fall back
      // to the actual loaded image's natural dimensions. Relying on the
      // React state `imageDimensions` right after calling setImageDimensions
      // can be unreliable because state updates are asynchronous.
      const dims = imageDimensions ?? { width: image.naturalWidth, height: image.naturalHeight };
      const stats = calculateAnalysisStats(faces, endTime - startTime, dims);
      setAnalysisStats(stats);

      // Draw overlays on canvas. Prefer the DOM imageRef if it's available
      // (so the overlay aligns to the visible image). If the DOM img isn't
      // ready yet, fall back to the loaded image object.
      const imgToDraw = imageRef.current ?? image;
      if (canvasRef.current && imgToDraw) {
        drawFaceOverlays(canvasRef.current, imgToDraw, faces);
      }

      toast({
        title: "Analysis complete",
        description: `Successfully detected ${faces.length} face${faces.length !== 1 ? 's' : ''} in the image.`,
      });

      // Save to database and local storage using the resolved dimensions
      const analysisData = {
        imageFileName: imageName,
        imageDimensions: dims,
        detectedFaces: faces,
        processingTime: `${(endTime - startTime) / 1000}s`
      };

      // Save to database
      saveAnalysisMutation.mutate(analysisData);

      // Save to local storage
      const localHistory = JSON.parse(localStorage.getItem('faceAnalysisHistory') || '[]');
      const newAnalysis = {
        id: crypto.randomUUID(),
        ...analysisData,
        analysisTimestamp: new Date().toISOString()
      };
      localHistory.unshift(newAnalysis);
      // Keep only last 10 analyses in local storage
      if (localHistory.length > 10) {
        localHistory.pop();
      }
      localStorage.setItem('faceAnalysisHistory', JSON.stringify(localHistory));

    } catch (err) {
      console.error('Analysis error:', err);
      toast({
        title: "Analysis failed",
        description: err instanceof Error ? err.message : "Unknown error occurred during analysis.",
        variant: "destructive"
      });
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setAnalysisProgress(0), 1000);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp']
    },
    multiple: false
  });

  const handleDownloadResults = () => {
    if (detectedFaces.length > 0 && analysisStats) {
      downloadResults(detectedFaces, analysisStats, imageName);
      toast({
        title: "Results downloaded",
        description: "Analysis results have been saved as JSON file.",
      });
    }
  };

  const handleAnalyzeNew = () => {
    setUploadedImage(null);
    setDetectedFaces([]);
    setAnalysisStats(null);
    setImageDimensions(null);
    setImageName('');
  };

  // static image fit mode (set here to 'contain' or 'cover')
  const IMAGE_FIT: 'contain' | 'cover' = 'contain';

  const handleExportData = () => {
    if (detectedFaces.length > 0) {
      const csvData = detectedFaces.map(face => 
        `${face.id},${face.age},${face.ageConfidence},${face.gender},${face.genderConfidence},${face.box.x},${face.box.y},${face.box.width},${face.box.height}`
      ).join('\n');
      
      const csv = `Face ID,Age,Age Confidence,Gender,Gender Confidence,X,Y,Width,Height\n${csvData}`;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `face-analysis-${imageName}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Data exported",
        description: "Face analysis data has been exported as CSV file.",
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Upload Section */}
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              <Upload className="text-primary mr-2 w-5 h-5" />
              Upload Image
            </h2>
            
            {/* Upload Zone */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed transition-colors duration-200 rounded-lg p-8 text-center cursor-pointer bg-muted/30 hover:bg-muted/50 ${
                isDragActive ? 'drag-over' : 'border-border hover:border-primary'
              }`}
              data-testid="upload-zone"
            >
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Upload className="text-primary text-2xl w-8 h-8" />
                </div>
                <div>
                  <p className="text-lg font-medium text-foreground">Drop your image here</p>
                  <p className="text-sm text-muted-foreground mt-1">or click to browse files</p>
                </div>
                <div className="flex items-center justify-center space-x-1 text-xs text-muted-foreground">
                  <span>Supports:</span>
                  <span className="bg-secondary px-2 py-1 rounded">JPG</span>
                  <span className="bg-secondary px-2 py-1 rounded">PNG</span>
                  <span className="bg-secondary px-2 py-1 rounded">WebP</span>
                </div>
              </div>
              <input {...getInputProps()} data-testid="image-input" />
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-center space-x-3">
                  <div className="processing">
                    <Cog className="animate-spin text-primary w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Loading models...</p>
                    <p className="text-sm text-muted-foreground">Preparing face detection models</p>
                  </div>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="mt-4 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                <p className="text-destructive font-medium">{error}</p>
              </div>
            )}

            {/* Processing Status */}
            {isAnalyzing && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-border" data-testid="processing-status">
                <div className="flex items-center space-x-3">
                  <div className="processing">
                    <Cog className="animate-spin text-primary w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">Analyzing faces...</p>
                    <p className="text-sm text-muted-foreground">Detecting faces and estimating age & gender</p>
                  </div>
                </div>
                <div className="mt-3">
                  <Progress value={analysisProgress} className="w-full" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Image Preview */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              <ImageIcon className="text-primary mr-2 w-5 h-5" />
              Image Preview
              {detectedFaces.length > 0 && (
                <span className="ml-auto text-sm text-muted-foreground flex items-center">
                  <Users className="mr-1 w-4 h-4" />
                  {detectedFaces.length} faces detected
                </span>
              )}
            </h3>
            
            <div className="relative bg-muted/30 rounded-lg min-h-[300px] flex items-center justify-center" data-testid="image-container">
              {!uploadedImage ? (
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="w-16 h-16 mx-auto mb-3" />
                  <p>No image uploaded yet</p>
                </div>
              ) : (
                <div className="relative w-full flex items-center justify-center">
                  <div className="relative inline-block w-4/5 h-4/5">
                    <img 
                      ref={imageRef}
                      src={uploadedImage} 
                      alt="Uploaded for analysis"
                      className={`rounded-lg shadow-md w-full h-full ${IMAGE_FIT === 'contain' ? 'object-contain' : 'object-cover'} block`}
                      data-testid="uploaded-image"
                    />
                    <canvas
                      ref={canvasRef}
                      // position the canvas to overlay the image element
                      className="absolute top-0 left-0 rounded-lg pointer-events-none w-full h-full"
                      style={{ display: detectedFaces.length > 0 ? 'block' : 'none' }}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Section */}
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              <BarChart className="text-primary mr-2 w-5 h-5" />
              Detection Results
              {analysisStats && (
                <span className="ml-auto text-sm bg-accent/10 text-accent px-2 py-1 rounded-full flex items-center">
                  <CheckCircle className="mr-1 w-4 h-4" />
                  Analysis Complete
                </span>
              )}
            </h2>

            {!analysisStats ? (
              <div className="text-center text-muted-foreground py-8">
                <BarChart className="w-16 h-16 mx-auto mb-3" />
                <p>Upload an image to see detection results</p>
              </div>
            ) : (
              <>
                {/* Results Summary */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-muted/30 rounded-lg p-4 text-center" data-testid="total-faces-stat">
                    <div className="text-2xl font-bold text-foreground">{analysisStats.totalFaces}</div>
                    <div className="text-sm text-muted-foreground">Faces Detected</div>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-4 text-center" data-testid="avg-confidence-stat">
                    <div className="text-2xl font-bold text-accent">{analysisStats.avgConfidence}%</div>
                    <div className="text-sm text-muted-foreground">Avg Confidence</div>
                  </div>
                </div>

                {/* Individual Face Results */}
                <div className="space-y-4" data-testid="face-results">
                  {detectedFaces.map((face, index) => {
                    const combinedConfidence = Math.round((face.ageConfidence + face.genderConfidence) / 2);
                    return (
                      <div 
                        key={face.id} 
                        className="border border-border rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
                        data-testid={`face-result-${index}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                              <User className="text-primary w-6 h-6" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-foreground">Face #{index + 1}</h4>
                              <p className="text-sm text-muted-foreground">
                                Position: ({Math.round(face.box.x)}, {Math.round(face.box.y)})
                              </p>
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            getConfidenceLevel(combinedConfidence) === 'High Confidence' 
                              ? 'bg-accent/10 text-accent' 
                              : 'bg-secondary text-secondary-foreground'
                          }`}>
                            {getConfidenceLevel(combinedConfidence)} · {combinedConfidence}%
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-foreground">Age</span>
                              <span className="text-sm font-mono font-semibold text-foreground" data-testid={`face-age-${index}`}>
                                {face.age}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="flex-1 bg-secondary rounded-full h-2">
                                <div 
                                  className="confidence-bar rounded-full h-2" 
                                  style={{ width: `${face.ageConfidence}%` }}
                                ></div>
                              </div>
                              <span className="text-xs font-mono text-muted-foreground" data-testid={`face-age-confidence-${index}`}>
                                {face.ageConfidence}%
                              </span>
                            </div>
                          </div>
                          
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-foreground">Gender</span>
                              <span className="text-sm font-semibold text-foreground flex items-center" data-testid={`face-gender-${index}`}>
                                <span className={`mr-1 ${face.gender === 'male' ? 'text-blue-500' : 'text-pink-500'}`}>
                                  {face.gender === 'male' ? '♂' : '♀'}
                                </span>
                                {face.gender.charAt(0).toUpperCase() + face.gender.slice(1)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="flex-1 bg-secondary rounded-full h-2">
                                <div 
                                  className="confidence-bar rounded-full h-2" 
                                  style={{ width: `${face.genderConfidence}%` }}
                                ></div>
                              </div>
                              <span className="text-xs font-mono text-muted-foreground" data-testid={`face-gender-confidence-${index}`}>
                                {face.genderConfidence}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Action Panel */}
        {detectedFaces.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
                <Download className="text-primary mr-2 w-5 h-5" />
                Actions
              </h3>
              
              <div className="space-y-3">
                <Button 
                  onClick={handleDownloadResults}
                  className="w-full"
                  data-testid="button-download-results"
                >
                  <Download className="mr-2 w-4 h-4" />
                  Download Results
                </Button>
                
                <Button 
                  onClick={handleAnalyzeNew}
                  variant="secondary"
                  className="w-full"
                  data-testid="button-analyze-new"
                >
                  <RefreshCw className="mr-2 w-4 h-4" />
                  Analyze New Image
                </Button>
                
                <Button 
                  onClick={handleExportData}
                  variant="outline"
                  className="w-full"
                  data-testid="button-export-data"
                >
                  <Share className="mr-2 w-4 h-4" />
                  Export Data
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Analysis History removed */}
      </div>

      {/* Technical Information removed */}
    </div>
  );
}
