# LLM Tokenizer Benchmark

## Overview
A client-side React web application for benchmarking token usage, response time, and cost of various Large Language Models (LLMs) across different languages. The tool focuses on comparing performance between English, Turkish, and Turkish without diacritics.

**Purpose:** Analyze and compare LLM tokenizer efficiency across languages  
**Current State:** Fully configured and running in Replit environment  
**Last Updated:** December 4, 2025

## Recent Changes
- **Dec 4, 2025:** Initial Replit setup completed
  - Configured Vite dev server for port 5000 with HMR over WSS
  - Set up workflow for development server
  - Configured static deployment with build process
  - All dependencies installed and working

## Project Architecture

### Technology Stack
- **Frontend Framework:** React 19.2.0 with TypeScript
- **Build Tool:** Vite 6.2.0
- **Styling:** Tailwind CSS (via CDN)
- **Charts:** Chart.js (via CDN)
- **Languages:** TypeScript 5.8.2

### Project Structure
```
.
├── components/          # React components
│   ├── AnalysisSummary.tsx
│   ├── ChartsDisplay.tsx
│   ├── ColumnMapper.tsx
│   ├── FileUpload.tsx
│   ├── Icons.tsx
│   ├── ProviderSettings.tsx
│   ├── ResultsDisplay.tsx
│   ├── RunControls.tsx
│   └── Toast.tsx
├── services/           # Service layer
│   ├── llmProviders.ts
│   └── tokenizerService.ts
├── App.tsx            # Main application component
├── index.tsx          # Application entry point
├── types.ts           # TypeScript type definitions
├── utils.ts           # Utility functions
├── translations.ts    # i18n translations (EN/TR)
├── vite.config.ts     # Vite configuration
└── package.json       # Project dependencies
```

### Key Features
- **Client-Side Only:** All processing happens in the browser, no backend required
- **Privacy-First:** API keys stored only in browser localStorage
- **Multi-Provider Support:** OpenAI, Google Gemini, Anthropic, xAI Grok
- **Multi-Language:** English and Turkish interface with bilingual support
- **Data Export:** Results can be exported to CSV or JSONL
- **Concurrency Control:** Configurable parallel requests and delays

### Configuration

#### Development
- Port: 5000 (required for Replit webview)
- Host: 0.0.0.0
- HMR: Configured for WSS over port 443
- Command: `npm run dev`

#### Production Deployment
- Type: Static site
- Build command: `npm run build`
- Output directory: `dist`
- The app builds to static HTML/CSS/JS files

### Supported LLM Providers
1. **OpenAI** - GPT models
2. **Google Gemini** - Gemini models  
3. **Anthropic** - Claude models
4. **xAI Grok** - Grok models

Users provide their own API keys, which are stored locally in the browser.

### Data Flow
1. User uploads CSV/JSONL dataset with parallel text (EN/TR)
2. User maps columns to required fields (id, en, tr, optional tr_nodia)
3. User configures LLM providers and API keys
4. Benchmark runs with configurable concurrency
5. Results displayed with charts and summary statistics
6. Export functionality for further analysis

## User Preferences
None specified yet.

## Development Notes
- This is a pure frontend application with no backend
- All API calls are made directly from the browser to LLM providers
- No database required
- No server-side processing
- Perfect for static deployment
