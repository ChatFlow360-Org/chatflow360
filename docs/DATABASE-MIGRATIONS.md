# ChatFlow360 - Guia de Migraciones

> Como manejar migraciones de base de datos con Prisma y Supabase.

## Comandos Prisma

### Permitidos

```bash
npx prisma generate          # Generar Prisma Client
npx prisma migrate dev       # Crear migracion (desarrollo)
npx prisma migrate deploy    # Aplicar migraciones (produccion)
npx prisma studio            # Browser visual de la DB
```

### PROHIBIDOS

```bash
npx prisma db push           # NUNCA - eliminaria tabla channel_knowledge (pgvector)
npx prisma migrate reset     # PELIGROSO - pierde datos y tablas custom
```

> La tabla `channel_knowledge` usa tipo VECTOR(1536) que Prisma no conoce. Un `db push` la eliminaria.

## Flujo de Migraciones

### Desarrollo

1. Modificar `prisma/schema.prisma`
2. Ejecutar `npx prisma migrate dev --name descripcion-del-cambio`
3. Prisma genera el SQL y lo aplica
4. Se crea archivo en `prisma/migrations/`
5. Ejecutar `npx prisma generate` para actualizar el client

### Produccion

1. Asegurar que las migraciones estan commiteadas
2. Ejecutar `npx prisma migrate deploy`
3. Verificar en Supabase Dashboard que los cambios se aplicaron

## Reglas

- Siempre crear migraciones con nombre descriptivo
- Nunca editar migraciones ya aplicadas
- Si un cambio de schema requiere datos, crear migration con SQL custom
- Revisar el SQL generado antes de aplicar en produccion
- Hacer backup antes de migraciones en produccion

## Supabase Dashboard (SQL directo)

Para cambios que no son parte del schema Prisma (funciones SQL, RLS policies, triggers, pgvector):
- Usar SQL Editor en Supabase Dashboard
- Documentar los cambios en este archivo
- Guardar scripts SQL en `scripts/` si son reutilizables

### Tablas manejadas via SQL (no Prisma)

| Tabla | Razon |
|-------|-------|
| `channel_knowledge` | Usa tipo VECTOR(1536) de pgvector |

### Scripts SQL del proyecto

| Script | Proposito |
|--------|-----------|
| `scripts/setup-rag.sql` | Crear tabla channel_knowledge + funciones + indices (pendiente) |
