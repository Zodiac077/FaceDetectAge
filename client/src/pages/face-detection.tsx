import { useEffect, useState } from 'react';
import { Brain, SunMoon } from 'lucide-react';
import FaceAnalysis from '@/components/face-analysis';

export default function FaceDetectionPage() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    // Tailwind is configured with `darkMode: ['class']` — toggle the
    // `dark` class on the root element so dark styles apply.
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    try { localStorage.setItem('theme', theme); } catch {}
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

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
              {/* Day/Night toggle placed where "Powered by Face-API.js" was */}
              <button
                className="flex items-center space-x-2 text-sm text-muted-foreground bg-muted/10 px-3 py-1 rounded"
                onClick={toggleTheme}
                aria-label="Toggle day/night theme"
                data-testid="button-toggle-theme"
              >
                <SunMoon className="w-4 h-4" />
                <span>{theme === 'light' ? 'Day' : 'Night'}</span>
              </button>
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
