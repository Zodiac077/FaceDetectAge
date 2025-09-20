import { FaceDetectionResult, AnalysisStats } from '@shared/schema';

export function calculateAnalysisStats(
  faces: FaceDetectionResult[],
  processingTime: number,
  imageDimensions: { width: number; height: number }
): AnalysisStats {
  const totalFaces = faces.length;
  
  const avgConfidence = totalFaces > 0 
    ? Math.round(faces.reduce((sum, face) => 
        sum + (face.ageConfidence + face.genderConfidence) / 2, 0) / totalFaces)
    : 0;

  return {
    totalFaces,
    avgConfidence,
    processingTime: `${(processingTime / 1000).toFixed(1)}s`,
    imageSize: `${imageDimensions.width}x${imageDimensions.height}`
  };
}

export function getConfidenceLevel(confidence: number): string {
  if (confidence >= 90) return 'High Confidence';
  if (confidence >= 75) return 'Good Confidence';
  if (confidence >= 60) return 'Medium Confidence';
  return 'Low Confidence';
}

export function getConfidenceLevelColor(confidence: number): string {
  if (confidence >= 90) return 'text-accent';
  if (confidence >= 75) return 'text-secondary-foreground';
  if (confidence >= 60) return 'text-muted-foreground';
  return 'text-destructive';
}

export function drawFaceOverlays(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  faces: FaceDetectionResult[]
) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Set canvas dimensions to match image
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  // Draw the image
  ctx.drawImage(image, 0, 0);

  // Draw face boxes and labels
  faces.forEach((face) => {
    const { x, y, width, height } = face.box;
    
    // Draw bounding box
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, width, height);
    
    // Draw semi-transparent overlay
    ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
    ctx.fillRect(x, y, width, height);
    
    // Draw label background
    const label = `${face.gender}, ${face.age} (${Math.round((face.ageConfidence + face.genderConfidence) / 2)}%)`;
    ctx.font = '12px Inter, sans-serif';
    const textWidth = ctx.measureText(label).width;
    
    ctx.fillStyle = '#10b981';
    ctx.fillRect(x, y - 24, textWidth + 16, 20);
    
    // Draw label text
    ctx.fillStyle = 'white';
    ctx.fillText(label, x + 8, y - 8);
  });
}

export function downloadResults(
  faces: FaceDetectionResult[],
  stats: AnalysisStats,
  imageName: string
) {
  const results = {
    analysis: {
      timestamp: new Date().toISOString(),
      imageName,
      stats,
      faces: faces.map(face => ({
        id: face.id,
        position: face.box,
        age: face.age,
        ageConfidence: face.ageConfidence,
        gender: face.gender,
        genderConfidence: face.genderConfidence
      }))
    }
  };

  const blob = new Blob([JSON.stringify(results, null, 2)], {
    type: 'application/json'
  });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `face-analysis-${imageName}-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
