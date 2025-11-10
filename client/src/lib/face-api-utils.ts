import { FaceDetectionResult, AnalysisStats } from '@shared/schema';

export function calculateAnalysisStats(
  faces: FaceDetectionResult[],
  processingTime: number,
  imageDimensions: { width: number; height: number }
): AnalysisStats {
  const totalFaces = faces.length;
  
  const avgConfidence = totalFaces > 0 
  ? Math.round(faces.reduce((sum, face) => {
    const combined = Math.round((face.ageConfidence + face.genderConfidence) / 2);
    return sum + combined;
    }, 0) / totalFaces)
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

  // Determine displayed image size (CSS size) vs natural size
  const displayWidth = image.clientWidth || image.width || image.naturalWidth;
  const displayHeight = image.clientHeight || image.height || image.naturalHeight;

  // Set canvas pixel dimensions to match the displayed size for crisp overlay
  canvas.width = Math.round(displayWidth);
  canvas.height = Math.round(displayHeight);

  // Clear canvas and draw the image scaled to the display size
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  // Draw face boxes and labels
  // If the detection boxes were computed in natural image coordinates,
  // scale them to the displayed size.
  const scaleX = canvas.width / image.naturalWidth;
  const scaleY = canvas.height / image.naturalHeight;

  faces.forEach((face) => {
    const { x, y, width, height } = face.box;
    const sx = x * scaleX;
    const sy = y * scaleY;
    const sw = width * scaleX;
    const sh = height * scaleY;
    
    // Draw bounding box
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
  ctx.strokeRect(sx, sy, sw, sh);
    
  // Draw semi-transparent overlay
  ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
  ctx.fillRect(sx, sy, sw, sh);
    
  // Draw label background — show age-specific confidence so it matches the
  // age confidence displayed in the Results panel.
  const label = `${face.gender}, ${face.age} (Age ${face.ageConfidence}%)`;
    ctx.font = '12px Inter, sans-serif';
    const textWidth = ctx.measureText(label).width;
    
    ctx.fillStyle = '#10b981';
    const labelX = sx;
    const labelY = sy - 24;
    ctx.fillRect(labelX, labelY, textWidth + 16, 20);
    
    // Draw label text
    ctx.fillStyle = 'white';
    ctx.fillText(label, labelX + 8, labelY + 16);
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
