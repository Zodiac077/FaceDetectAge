import { useState } from 'react';
import { Brain, Shield } from 'lucide-react';
import FaceAnalysis from '@/components/face-analysis';

export default function FaceDetectionPage() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-primary p-2 rounded-lg">
                <Brain className="text-primary-foreground text-xl w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">AI Face Analysis</h1>
                <p className="text-xs text-muted-foreground">Age & Gender Detection</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 text-sm text-muted-foreground">
                <Shield className="text-accent w-4 h-4" />
                <span>Powered by Face-API.js</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FaceAnalysis />
      </div>
    </div>
  );
}
