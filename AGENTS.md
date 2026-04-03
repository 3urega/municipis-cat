<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# Useful commands

```bash
npm prep          # lint + build + test
npm run docker:up # Postgres (ia-travel en :15432); ver `.env.example`
npm run docker:up:with-ollama # + Ollama embebido si no usas otro en :11434
npm run dev       # local dev server (not Docker)
npm run lint:fix
npm run test

docker:up: docker compose up -d
docker:down: docker compose down
"docker:up:with-ollama": "docker compose --profile ollama up -d"
"db:generate": "prisma generate"
"db:migrate": "prisma migrate dev"
"db:push": "prisma db push"
"db:seed": "tsx scripts/seed-municipalities.ts && tsx scripts/seed-dev-superadmin.ts"
"data:comarques": "tsx scripts/build-municipi-comarca-json.ts"
"data:comarques-geojson": "tsx scripts/build-comarques-geojson.ts"
"data:visit-static-params": "tsx scripts/write-visit-static-params.ts"
"build:capacitor": "powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-capacitor.ps1"
"build:capacitor:unix": "bash scripts/build-capacitor.sh"
"cap:sync": "cap sync"
"android:sync": "cap sync android"
"android:open": "cap open android"
```

# Architecture

- Next.js 16 Onion Architecture, DDD.
- Frontend in `src/app/`, API routes in `src/app/api/`.
- Backend in `src/contexts/`.

# Documentation

- Detailed conventions with examples live in `docs/`.
- **Do NOT read all docs upfront.**
- When working on a task, use this map to find and read only the docs relevant to your task:

```
docs/
├── code-style.md
├── documentation-format.md
├── backend/
│   ├── api-routes-reflect-metadata.md
│   ├── dependency-injection-diod.md
│   ├── hexagonal-architecture.md
│   └── thin-api-routes.md
├── database/
│   ├── not-null-fields.md
│   ├── table-naming-singular-plural-convention.md
│   └── text-over-varchar-char-convention.md
└── testing/
    ├── mock-objects.md
    └── object-mothers.md
```

<!-- END:nextjs-agent-rules -->
