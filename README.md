# Sitio publico de rifas

Primera version del sitio publico conectado al backend por slug.

## Como funciona

- La ruta publica se resuelve por slug, por ejemplo: `/agropecuario`
- El frontend consulta el backend en `GET /public-site/:slug`
- El backend es la fuente de verdad del contenido
- El panel administrativo define los datos que se muestran

## Variables de entorno

- `PORT`: puerto del web service
- `API_BASE_URL`: URL publica del backend, por ejemplo `https://tu-backend.onrender.com`
- `NEXT_PUBLIC_API_URL`: alternativa soportada para Render, apuntando al backend

## Desarrollo local

```bash
npm start
```

Luego abre:

- `http://localhost:3000/agropecuario`
- o `http://localhost:3000/?slug=agropecuario`

## Produccion

En Render:

- crea un web service para este proyecto
- define `API_BASE_URL` apuntando al backend
- usa `npm start`

## Estado actual

- Hero dinamico
- Sorteos visibles
- Metodos de pago
- Videos de ganadores
- FAQ
- Legal
- Vista previa del snapshot
