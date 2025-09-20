import { useState, useEffect, useRef } from 'react';
import * as faceapi from 'face-api.js';
import { FaceDetectionResult } from '@shared/schema';

interface UseFaceApiReturn {
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
  detectFaces: (imageElement: HTMLImageElement) => Promise<FaceDetectionResult[]>;
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

  const detectFaces = async (imageElement: HTMLImageElement): Promise<FaceDetectionResult[]> => {
    if (!isLoaded) {
      throw new Error('Face-API models not loaded yet');
    }

    try {
      const detections = await faceapi
        .detectAllFaces(imageElement)
        .withFaceLandmarks()
        .withAgeAndGender();

      return detections.map((detection, index) => {
        const { x, y, width, height } = detection.detection.box;
        const { age, gender, genderProbability } = detection;
        
        // Calculate confidence scores
        const ageConfidence = Math.min(95, Math.max(70, 90 - Math.abs(age - 30) * 0.5));
        const genderConfidence = Math.round(genderProbability * 100);

        return {
          id: `face-${index + 1}`,
          box: { x, y, width, height },
          age: Math.round(age),
          ageConfidence: Math.round(ageConfidence),
          gender: gender as 'male' | 'female',
          genderConfidence,
          landmarks: detection.landmarks.positions.map(point => ({
            x: point.x,
            y: point.y
          }))
        };
      });
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
