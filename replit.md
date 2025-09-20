# Face Detection & Analysis Application

## Overview

This is a full-stack face detection and analysis application built with React, TypeScript, and Express. The application uses Face-API.js to perform real-time face detection, age estimation, and gender prediction on uploaded images. Users can upload images through a drag-and-drop interface and receive detailed analysis results including face coordinates, confidence scores, and demographic predictions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- **React 18** with TypeScript for type-safe component development
- **Vite** as the build tool and development server for fast hot module replacement
- **Wouter** for lightweight client-side routing instead of React Router

**UI Framework & Styling**
- **shadcn/ui** component library built on Radix UI primitives
- **Tailwind CSS** for utility-first styling with custom CSS variables for theming
- **Lucide React** for consistent iconography
- Responsive design with mobile-first approach

**State Management & Data Fetching**
- **TanStack Query (React Query)** for server state management and caching
- **React Hook Form** with **Zod** validation for form handling
- Custom hooks for Face-API.js integration and mobile detection

**Face Detection Engine**
- **Face-API.js** library for client-side face detection and analysis
- Models loaded from CDN for face detection, age/gender prediction, and landmark detection
- Canvas-based image processing and overlay rendering

### Backend Architecture

**Server Framework**
- **Express.js** with TypeScript for the REST API server
- Modular route registration system with error handling middleware
- Development-specific Vite integration for SSR and HMR

**Data Storage**
- **Drizzle ORM** with PostgreSQL for type-safe database operations
- **Neon Database** as the serverless PostgreSQL provider
- In-memory storage abstraction layer with interface-based design for easy swapping

**Database Schema**
- `users` table for user authentication with username/password
- `face_analyses` table storing detection results, image metadata, and processing stats
- JSON columns for complex data structures (face coordinates, image dimensions)

### Development Environment

**Configuration & Tooling**
- **ESBuild** for production server bundling
- **PostCSS** with Autoprefixer for CSS processing
- **TypeScript** with strict mode and path mapping
- Environment-specific configurations for development vs production

**Development Features**
- Replit-specific plugins for runtime error handling and development banners
- File system restrictions for security
- Hot reload for both client and server code

## External Dependencies

### Database & Storage
- **Neon Database** - Serverless PostgreSQL database hosting
- **Drizzle Kit** - Database migrations and schema management

### AI/ML Services
- **Face-API.js** - Client-side face detection and analysis models
- **CDN Model Loading** - Face detection models served from vladmandic/face-api CDN

### UI & Design System
- **Radix UI** - Unstyled, accessible UI component primitives
- **shadcn/ui** - Pre-built component library with consistent design tokens
- **Tailwind CSS** - Utility-first CSS framework
- **Google Fonts** - Web fonts (Inter, DM Sans, Fira Code, Geist Mono, Architects Daughter)

### Development & Build Tools
- **Vite** - Frontend build tool and development server
- **Replit Development Tools** - Runtime error overlays, cartographer, and dev banners
- **ESBuild** - Fast JavaScript/TypeScript bundler for production builds

### Utility Libraries
- **nanoid** - URL-safe unique ID generation
- **date-fns** - Date manipulation and formatting
- **clsx & class-variance-authority** - Conditional CSS class management
- **React Dropzone** - File upload with drag and drop functionality