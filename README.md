# 🛡️ Qamqor

> **Qamqor** is a modern, responsive React/Vite-based web application providing a platform for healthcare portal access, integrating government services, patient portals, psychiatric/narcological service pages, and administrative dashboards. Developed for SDU 2026.

---

## ✨ Features Prepared & Ready

- **🏠 Home & Informational Pages**: Fully designed landing pages including integration for Government Services, Patients Sections, and specialized medical service pages.
- **🔐 Secure Authentication**: Login, Registration, and Password Recovery flows.
- **📊 User Dashboard**: An intuitive, scalable dashboard section for end-users.
- **📱 Responsive Layout**: Fully adaptive design using Tailwind CSS, ensuring smooth user experiences on mobile, tablet, and desktop devices.
- **🎨 Modern UI/UX**: Built with Radix UI components, Framer Motion for smooth micro-animations, and Lucide React icons.
- **🧩 Feature-Sliced Design (FSD)**: Clean architectural pattern separating layers for perfect maintainability.

## 🛠️ Tech Stack

- **Framework:** React 18 / Vite
- **Language:** TypeScript
- **Routing:** wouter
- **Styling:** Tailwind CSS / `clsx` / `tailwind-merge`
- **UI Components:** Radix UI Primitives / Custom UI widgets
- **Package Manager:** `pnpm` with Workspaces support

## 🚀 How to Run Locally

### Prerequisites

Ensure you have [Node.js](https://nodejs.org/) (version 18+) and [pnpm](https://pnpm.io/) installed.

### Installation

1. Install all dependencies across the monorepo:
   ```bash
   pnpm install
   ```

2. To start the local Vite development server for the Qamqor workspace, run:
   ```bash
   pnpm --filter @workspace/qamqor dev
   ```

The app will become accessible at `http://localhost:5173`.

## 🗂️ Project Structure

The project relies on [Feature-Sliced Design (FSD)](https://feature-sliced.design/):

```
artifacts/qamqor/src/
├── app/          # App-wide settings, global styles (index.css), and providers
├── pages/        # Route pages (home, auth, dashboard, etc.)
├── widgets/      # Compositional components (Header, Footer, complex blocks)
├── features/     # User interactions, form logic
├── entities/     # Business logic, data models
└── shared/       # Reusable UI components, hooks, api instances
```