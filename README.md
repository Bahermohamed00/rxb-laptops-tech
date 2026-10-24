# RXB Laptops / Tech — visual prototype

A React + TypeScript + Vite visual prototype for the RXB intro and homepage. It is frontend-only; the laptop listings and prices are illustrative demo data.

## Run locally

Requirements: Node.js 20.19+ or 22.12+ and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). To create a production build, run `npm run build`; to serve that build locally, run `npm run preview`.

## Project files

```text
public/                   Original RXB logo and assembly-piece assets
src/App.tsx               Top-level homepage and intro composition
src/main.tsx              React entry point
src/features/intro/       Intro lifecycle, LogoAssembly, and dedicated CSS
src/features/home/        Homepage composition, product types, and page CSS
src/data/demo-products.ts Illustrative product data
src/styles/globals.css     Shared design tokens and base styles
index.html                Vite page shell
```

The supplied original logo is stored at `public/rxb-logo-transparent.png`; its assembly layers are in `public/assembly-pieces/`.

The intro advances after about 2.7 seconds. Use **Skip Intro** to jump to the homepage immediately. The homepage language toggle switches the preview into an Arabic direction; product names remain illustrative.
