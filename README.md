# Docker Optimizer AI

An AI-powered tool to optimize Dockerfiles for size, security, build speed, and maintainability using the Gemini 3 Pro model.

## Features

- **Intelligent Refactoring**: Uses Gemini 3 Pro to automatically implement multi-stage builds, optimize layer caching, and improve security.
- **Detailed Change Log**: A clear "Before vs After" comparison table explaining exactly what was changed and why.
- **YAML Analysis Report**: Generates a structured YAML report of the optimization strategy and improvements.
- **Dynamic System Prompt**: Configuration and AI instructions are managed via `metadata.json`.
- **Modern UI**: Built with React, Tailwind CSS, and a dark-themed aesthetic.

## Prerequisites

- **Node.js**: Version 18.0 or higher.
- **Gemini API Key**: You need a valid API key from [Google AI Studio](https://aistudio.google.com/).

## Local Development Setup

To run this project on your local machine, follow these steps:

### 1. Clone the Repository
Download the project files to your local machine and navigate to the project root.

### 2. Install a Development Server
Since this project uses ES modules and JSX, you need a development server that can handle TypeScript/React transformations. [Vite](https://vitejs.dev/) is highly recommended.

```bash
# Initialize a npm project if not already done
npm init -y

# Install Vite and React dependencies
npm install vite @vitejs/plugin-react react react-dom @google/genai
```

### 3. Configure Environment Variables
The application expects the Gemini API key to be available via `process.env.API_KEY`. 

Create a `.env` file in the project root:
```env
VITE_API_KEY=your_actual_api_key_here
```

### 4. Create Vite Config
Create a `vite.config.ts` file in the root to ensure `process.env` is mapped correctly:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.VITE_API_KEY)
  }
});
```

### 5. Run the Application
Start the development server:

```bash
npx vite
```

Open your browser to `http://localhost:5173`.

## Project Structure

- `index.html`: The main entry point using Tailwind CSS and ES Module import maps.
- `index.tsx`: Initializing the React application.
- `App.tsx`: Main application logic, UI layout, and state management.
- `metadata.json`: Contains the application metadata and the **System Prompt** used by the AI.
- `services/geminiService.ts`: Integration with the `@google/genai` SDK.
- `types.ts`: TypeScript interfaces for the optimization results and application state.
- `components/CodeBlock.tsx`: A reusable syntax-highlighted code viewer/editor.

## How it Works

1. **Prompt Injection**: On launch, the app fetches `metadata.json` to retrieve the `systemPrompt`.
2. **AI Analysis**: When you click "Optimize", the Dockerfile is sent to Gemini 3 Pro along with the system instructions.
3. **Structured Response**: The model returns a structured JSON object containing the optimized code, a list of improvements, and a change-by-change comparison.
4. **YAML Generation**: The app dynamically converts the JSON result into a YAML format for users who prefer a structured report.

## Best Practices Implemented
The AI is instructed to prioritize:
- **Multi-stage builds**: Separating build dependencies from the final runtime image.
- **Base Image selection**: Moving to Alpine or Slim versions of official images.
- **Layer Optimization**: Combining `RUN` commands and ordering `COPY` instructions to maximize cache hits.
- **Security**: Adding non-root users and pinning package versions.
