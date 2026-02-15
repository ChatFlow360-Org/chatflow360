# ChatFlow360 - Sistema RAG y Conocimiento

> Documentacion del sistema de Retrieval-Augmented Generation con Supabase Vector (pgvector).

## Concepto: Instrucciones vs Conocimiento

El cliente configura dos cosas separadas desde el panel del dashboard:

### Instrucciones (AiSettings)

- **Que es:** Como debe comportarse la IA (personalidad, tono, reglas, restricciones)
- **Donde se guarda:** `ai_settings.system_prompt`
- **Ejemplo:** "Eres un asistente de Miami Dental Clinic. Responde siempre en espanol. Se amable y profesional. No ofrezcas descuentos."
- **Se envia como:** System prompt al modelo de OpenAI

### Conocimiento (ChannelKnowledge)

- **Que es:** Informacion factual que la IA consulta para dar respuestas precisas
- **Donde se guarda:** Tabla `channel_knowledge` con embeddings (pgvector)
- **Ejemplo:** FAQs, lista de servicios con precios, horarios, politicas, informacion del negocio
- **Se envia como:** Contexto relevante inyectado en el prompt via busqueda semantica (RAG)

## Arquitectura RAG

### Stack

| Componente | Tecnologia |
|-----------|-----------|
| Vector Store | Supabase Vector (pgvector extension) |
| Embeddings | OpenAI `text-embedding-3-small` (1536 dimensiones) |
| Busqueda | Cosine similarity via funcion SQL |
| LLM | OpenAI GPT-4o-mini |

### Flujo de Respuesta

```
Visitante envia mensaje
    │
    ├── 1. Generar embedding del mensaje (text-embedding-3-small)
    │
    ├── 2. Busqueda semantica en channel_knowledge
    │      WHERE channel_id = :channelId
    │      ORDER BY embedding <=> query_embedding
    │      LIMIT 5
    │      (filtrar por threshold >= 0.5)
    │
    ├── 3. Armar prompt final:
    │      ┌─────────────────────────────┐
    │      │ SYSTEM: Instrucciones       │  ← ai_settings.system_prompt
    │      │ + Contexto relevante (RAG)  │  ← chunks de channel_knowledge
    │      │                             │
    │      │ USER: Mensaje del visitante │
    │      └─────────────────────────────┘
    │
    ├── 4. OpenAI genera respuesta
    │
    └── 5. Verificar handoff keywords → si match → takeover humano
```

## Tabla: channel_knowledge

### SQL de Creacion

```sql
-- Habilitar pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabla de conocimiento por canal
CREATE TABLE channel_knowledge (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indice HNSW para busqueda rapida
CREATE INDEX idx_channel_knowledge_embedding
  ON channel_knowledge
  USING hnsw (embedding vector_cosine_ops);

-- Indice para filtrar por canal
CREATE INDEX idx_channel_knowledge_channel_id
  ON channel_knowledge (channel_id);
```

### Funcion de Busqueda Semantica

```sql
CREATE OR REPLACE FUNCTION search_channel_knowledge(
  p_channel_id UUID,
  p_query_embedding VECTOR(1536),
  p_match_threshold FLOAT DEFAULT 0.5,
  p_match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ck.id,
    ck.title,
    ck.content,
    1 - (ck.embedding <=> p_query_embedding) AS similarity
  FROM channel_knowledge ck
  WHERE ck.channel_id = p_channel_id
    AND 1 - (ck.embedding <=> p_query_embedding) > p_match_threshold
  ORDER BY ck.embedding <=> p_query_embedding
  LIMIT p_match_count;
END;
$$;
```

### Funcion de Insercion

```sql
CREATE OR REPLACE FUNCTION insert_channel_knowledge(
  p_channel_id UUID,
  p_title TEXT,
  p_content TEXT,
  p_embedding VECTOR(1536),
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO channel_knowledge (channel_id, title, content, embedding, metadata)
  VALUES (p_channel_id, p_title, p_content, p_embedding, p_metadata)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
```

## Chunking Strategy

Cuando el cliente sube contenido largo, se divide en chunks:

| Parametro | Valor |
|-----------|-------|
| Tamano maximo de chunk | ~1000 caracteres |
| Overlap entre chunks | 200 caracteres |
| Separadores | Parrafos > Oraciones > Palabras |

```typescript
// Ejemplo de chunking
const chunks = splitIntoChunks(content, {
  maxSize: 1000,
  overlap: 200,
  separators: ['\n\n', '\n', '. ', ' '],
});

// Cada chunk se guarda con su propio embedding
for (const chunk of chunks) {
  const embedding = await generateEmbedding(chunk);
  await insertChannelKnowledge(channelId, title, chunk, embedding);
}
```

## Panel del Dashboard (UI)

### Tab Instrucciones

- Textarea para el system prompt
- Selector de modelo (gpt-4o-mini, etc.)
- Temperature slider
- Max tokens
- Handoff keywords

### Tab Conocimiento

- Lista de items de conocimiento existentes (titulo, preview del contenido, fecha)
- Boton "Agregar conocimiento"
- Formulario: titulo + contenido (textarea largo)
- Opcion futura: subir archivos (PDF, TXT)
- Eliminar items individuales

## API Endpoints (Conocimiento)

```
GET    /api/channels/[id]/knowledge         # Listar conocimiento del canal
POST   /api/channels/[id]/knowledge         # Agregar (genera embedding y guarda)
DELETE /api/channels/[id]/knowledge/[kId]   # Eliminar item
```

## Aislamiento Multi-tenant

- Cada query de conocimiento SIEMPRE filtra por `channel_id`
- Un canal solo puede acceder a su propio conocimiento
- Validar que el canal pertenece a la org del usuario autenticado

## Consideraciones

### Por que SQL directo y no Prisma?

Prisma no soporta el tipo `VECTOR` de pgvector. La tabla `channel_knowledge` se crea y consulta via funciones SQL en Supabase. **NUNCA usar `prisma db push`** porque podria eliminar esta tabla.

### Performance

- Indice HNSW permite busqueda en ~10ms para miles de registros
- Limitar a 5 resultados relevantes por query
- Threshold de 0.5 para filtrar resultados irrelevantes
- Embeddings de 1536 dimensiones (text-embedding-3-small es rapido y economico)

### Soporte Multilingue

- `text-embedding-3-small` soporta multiples idiomas
- Un chunk en espanol puede ser encontrado con una query en ingles (y viceversa)
- Ideal para el mercado bilingue EN/ES de Miami
