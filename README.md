# Low Racing

## Project Overview

This is a Next.js application that integrates with Google Drive for file management, featuring user authentication, file uploads, and JSON file editing capabilities.

## Features

- Google OAuth authentication
- Google Drive integration for file management
- File upload, download, and management
- JSON file editing with syntax highlighting
- Responsive design
- Real-time updates using server actions

## Prerequisites

- Node.js 18+ and npm 9+
- Google Cloud Platform project with Google Drive API enabled
- PostgreSQL database (or compatible database)

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```
# Database
DATABASE_URL="your_database_connection_string"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your_nextauth_secret"

# Google OAuth
GOOGLE_CLIENT_ID="your_google_client_id"
GOOGLE_CLIENT_SECRET="your_google_client_secret"

# Google Drive API
GOOGLE_DRIVE_CLIENT_EMAIL="your_google_drive_client_email"
GOOGLE_DRIVE_PRIVATE_KEY="your_google_drive_private_key"
GOOGLE_DRIVE_FOLDER_ID="your_google_drive_folder_id"
```

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up the database:
   ```bash
   npx prisma migrate dev --name init
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

### Netlify

1. Push your code to a Git repository
2. Connect the repository to Netlify
3. Set the following environment variables in Netlify:
   - `NODE_VERSION`: 20
   - `NPM_FLAGS`: --legacy-peer-deps
   - `NODE_OPTIONS`: --max_old_space_size=4096
   - `NEXT_TELEMETRY_DISABLED`: 1
   - All environment variables from `.env.local`

### Vercel

1. Push your code to a Git repository
2. Import the repository to Vercel
3. Set the environment variables in Vercel
4. Deploy!

## Build

```bash
npm run build
```

## Linting

```bash
npm run lint
```

## Tasks

- [x] Responsividade
- [x] Adicionar opção de qual usuário fez o upload exibindo o nome e avatar
- [x] Adicionar opção de editar o json do arquivo
- [ ] Subir todo o site no lowracing.com