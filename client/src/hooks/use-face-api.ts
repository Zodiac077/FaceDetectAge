import { useState, useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';
import { FaceDetectionResult } from '@shared/schema';

interface UseFaceApiReturn {
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  detectFaces: (imageElement: HTMLImageElement, useEnsemble?: boolean) => Promise<FaceDetectionResult[]>;
}

export function useFaceApi(): UseFaceApiReturn {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const modelsLoaded = useRef(false);

  useEffect(() => {
    async function loadModels() {
      try {
        setIsLoading(true);
        setError(null);

        // Load models from CDN
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@latest/model';
        
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
        ]);

        modelsLoaded.current = true;
        setIsLoaded(true);
      } catch (err) {
        console.error('Error loading Face-API models:', err);
        setError('Failed to load face detection models. Please check your internet connection.');
      } finally {
        setIsLoading(false);
      }
    }

    if (!modelsLoaded.current) {
      loadModels();
    }
  }, []);

  const detectFaces = async (imageElement: HTMLImageElement, useEnsemble = true): Promise<FaceDetectionResult[]> => {
    if (!isLoaded) {
      throw new Error('Face-API models not loaded yet');
    }

    try {
      // Create an offscreen canvas to resize (upscale) the image for better detection
      const targetWidth = 1024; // tweak this (800-1400) based on memory/perf
      const naturalW = imageElement.naturalWidth || imageElement.width;
      const naturalH = imageElement.naturalHeight || imageElement.height;

      // Only scale when beneficial to avoid unnecessary work
      const scale = Math.max(1, targetWidth / Math.max(1, naturalW));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(naturalW * scale);
      canvas.height = Math.round(naturalH * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Unable to create canvas context');
      ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);

      // Use SSD Mobilenet v1 (more accurate than tiny) with a reasonable minConfidence
      const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.35 });

      const detections = await faceapi
        .detectAllFaces(canvas, options)
        .withFaceLandmarks()
        .withAgeAndGender();

      // Map detections back to original image coordinates by dividing by scale
      const invScale = 1 / scale;
      const initialResults = detections.map((detection, index) => {
        const { x, y, width, height } = detection.detection.box;
        const { age, gender, genderProbability } = detection as any;

        const ageConfidence = Math.min(95, Math.max(70, 90 - Math.abs(age - 30) * 0.5));
        const genderConfidence = Math.round((genderProbability ?? 0) * 100);

        return {
          id: `face-${index + 1}`,
          box: { x: x * invScale, y: y * invScale, width: width * invScale, height: height * invScale },
          rawBox: { x, y, width, height }, // original in scaled canvas coords
          age: age,
          ageConfidence: Math.round(ageConfidence),
          gender: gender as 'male' | 'female',
          genderConfidence,
          landmarks: detection.landmarks.positions.map(point => ({ x: point.x * invScale, y: point.y * invScale }))
        } as any;
      });

      if (!useEnsemble) {
        // finalize results mapped back to original coords and rounded ages
        return initialResults.map((r: any) => ({
          id: r.id,
          box: r.box,
          age: Math.round(r.age),
          ageConfidence: r.ageConfidence,
          gender: r.gender,
          genderConfidence: r.genderConfidence,
          landmarks: r.landmarks
        }));
      }

      // Ensemble: for each detected face, extract multiple padded crops and average age/gender predictions
      const ensembleResults: any[] = [];
      for (const r of initialResults) {
        const crops = [0.1, 0.25, 0.45].map(pad => {
          const cx = Math.max(0, r.rawBox.x - r.rawBox.width * pad);
          const cy = Math.max(0, r.rawBox.y - r.rawBox.height * pad);
          const cw = Math.min(canvas.width - cx, r.rawBox.width * (1 + pad * 2));
          const ch = Math.min(canvas.height - cy, r.rawBox.height * (1 + pad * 2));
          return { x: Math.round(cx), y: Math.round(cy), w: Math.round(cw), h: Math.round(ch) };
        });

        const preds = await Promise.all(crops.map(async (c) => {
          const cropCanvas = document.createElement('canvas');
          cropCanvas.width = c.w;
          cropCanvas.height = c.h;
          const cropCtx = cropCanvas.getContext('2d')!;
          cropCtx.drawImage(canvas, c.x, c.y, c.w, c.h, 0, 0, c.w, c.h);

          // run age/gender only on the crop
          const res = await faceapi
            .detectSingleFace(cropCanvas)
            .withFaceLandmarks()
            .withAgeAndGender();

          if (!res) return null;
          return { age: res.age, gender: res.gender, genderProbability: (res as any).genderProbability ?? 0 };
        }));

        // Average predictions (ignore nulls)
        const valid = preds.filter(Boolean) as any[];
        if (valid.length === 0) {
          // fallback to initial detection
          ensembleResults.push({
            id: r.id,
            box: r.box,
            age: Math.round(r.age),
            ageConfidence: r.ageConfidence,
            gender: r.gender,
            genderConfidence: r.genderConfidence,
            landmarks: r.landmarks
          });
          continue;
        }

        const avgAge = valid.reduce((s, p) => s + p.age, 0) / valid.length;
        const avgGenderProb = valid.reduce((s, p) => s + p.genderProbability, 0) / valid.length;
        // decide gender by averaging probabilities (assumes genderProbability is prob of predicted gender)
        // we convert to percent
        const avgGenderConfidence = Math.round(avgGenderProb * 100);
        // compute age confidence similarly to before
        const ageConfidence = Math.min(95, Math.max(70, 90 - Math.abs(avgAge - 30) * 0.5));

        ensembleResults.push({
          id: r.id,
          box: r.box,
          age: Math.round(avgAge),
          ageConfidence: Math.round(ageConfidence),
          gender: valid[0].gender as 'male' | 'female', // keep majority/first prediction for label
          genderConfidence: avgGenderConfidence,
          landmarks: r.landmarks
        });
      }

      return ensembleResults;
    } catch (err) {
      console.error('Error during face detection:', err);
      throw new Error('Failed to analyze faces in the image');
    }
  };

  return {
    isLoaded,
    isLoading,
    error,
    detectFaces
  };
}
