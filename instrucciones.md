Perfecto — ahora ya entramos en la parte divertida 🔥

Te voy a montar el **mapa funcional completo en Next.js (App Router)** con:

* 🗺️ GeoJSON de municipios
* 🖱️ click en municipio
* 🎨 color visited / not visited
* 📦 estado global (Zustand)
* 📌 side panel con notas básicas

---

# 🚀 1. Instala dependencias

```bash
npm install leaflet react-leaflet zustand
```

y estilos de Leaflet:

```bash
npm install leaflet
```

---

# 🎨 2. Importa CSS de Leaflet

En:

```ts
/src/app/layout.tsx
```

añade:

```ts
import 'leaflet/dist/leaflet.css'
```

---

# 🧠 3. Store (visited municipios)

```ts
// src/store/useMunicipalities.ts
import { create } from 'zustand'

type State = {
  visited: Record<string, { notes?: string }>
  selected: string | null
  markVisited: (id: string) => void
  setSelected: (id: string | null) => void
  updateNotes: (id: string, notes: string) => void
}

export const useMunicipalities = create<State>((set) => ({
  visited: {},
  selected: null,

  markVisited: (id) =>
    set((state) => ({
      visited: {
        ...state.visited,
        [id]: { ...state.visited[id] }
      }
    })),

  setSelected: (id) => set({ selected: id }),

  updateNotes: (id, notes) =>
    set((state) => ({
      visited: {
        ...state.visited,
        [id]: {
          ...state.visited[id],
          notes
        }
      }
    }))
}))
```

---

# 🗺️ 4. Componente mapa

```tsx
// src/components/Map.tsx
'use client'

import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet'
import { useMunicipalities } from '@/store/useMunicipalities'
import type { FeatureCollection } from 'geojson'

import data from '@/public/data/catalunya-municipis.geojson'

export default function Map() {
  const visited = useMunicipalities((s) => s.visited)
  const setSelected = useMunicipalities((s) => s.setSelected)

  const onEachFeature = (feature: any, layer: any) => {
    const id = feature.properties.id || feature.properties.ine_code

    layer.on({
      click: () => {
        setSelected(id)
      }
    })
  }

  const style = (feature: any) => {
    const id = feature.properties.id || feature.properties.ine_code

    const isVisited = !!visited[id]

    return {
      fillColor: isVisited ? '#22c55e' : '#94a3b8',
      weight: 1,
      color: '#1e293b',
      fillOpacity: 0.6
    }
  }

  return (
    <MapContainer
      center={[41.5912, 1.5209]}
      zoom={8}
      style={{ height: '100vh', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <GeoJSON
        data={data as FeatureCollection}
        style={style}
        onEachFeature={onEachFeature}
      />
    </MapContainer>
  )
}
```

---

# 📌 5. Side panel (notas + visited)

```tsx
// src/components/SidePanel.tsx
'use client'

import { useMunicipalities } from '@/store/useMunicipalities'

export default function SidePanel() {
  const selected = useMunicipalities((s) => s.selected)
  const visited = useMunicipalities((s) => s.visited)
  const updateNotes = useMunicipalities((s) => s.updateNotes)
  const markVisited = useMunicipalities((s) => s.markVisited)

  if (!selected) return null

  const data = visited[selected] || {}

  return (
    <div className="fixed right-0 top-0 w-80 h-full bg-white shadow-lg p-4">
      <h2 className="text-lg font-bold mb-2">
        Municipio: {selected}
      </h2>

      <button
        className="bg-green-500 text-white px-3 py-1 rounded"
        onClick={() => markVisited(selected)}
      >
        Marcar como visitado
      </button>

      <textarea
        className="w-full mt-4 border p-2"
        placeholder="Notas..."
        value={data.notes || ''}
        onChange={(e) =>
          updateNotes(selected, e.target.value)
        }
      />
    </div>
  )
}
```

---

# 🧩 6. Página principal

```tsx
// src/app/page.tsx
import dynamic from 'next/dynamic'
import SidePanel from '@/components/SidePanel'

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false
})

export default function Page() {
  return (
    <div className="relative">
      <Map />
      <SidePanel />
    </div>
  )
}
```

---

# 📂 7. Coloca el GeoJSON

Ponlo aquí:

```
/public/data/catalunya-municipis.geojson
```

---

# ⚠️ 8. Fix importante (Leaflet en Next.js)

Si te da error de iconos:

añade esto en `Map.tsx` o `layout`:

```ts
import L from 'leaflet'

delete (L.Icon.Default.prototype as any)._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/marker-icon-2x.png',
  iconUrl: '/marker-icon.png',
  shadowUrl: '/marker-shadow.png'
})
```

---

# 🧠 RESULTADO FINAL

Ya tienes:

✔ mapa funcional
✔ municipios clicables
✔ visited state
✔ notas por municipio
✔ side panel
✔ base lista para Prisma

---

# 🚀 SIGUIENTE NIVEL (te recomiendo)

Ahora lo natural sería:

### 1. Persistencia con Prisma

* guardar visits reales

### 2. login (opcional)

* usuario único o multi-user

### 3. fotos reales

* S3 / Supabase Storage

### 4. timeline de viajes

---

Si quieres, el siguiente paso te lo dejo muy potente:

👉 “pasar de estado local → Prisma + PostgreSQL real”

y ya tienes app seria, no demo 🔥
