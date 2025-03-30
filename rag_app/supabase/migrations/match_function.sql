-- Create the matching function for allopathic medicines
CREATE OR REPLACE FUNCTION match_allopathic_medicines(
  query_embedding vector(768),
  match_count int DEFAULT 5,
  filter jsonb DEFAULT '{}'
)
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  embedding vector(768),
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.content,
    a.metadata,
    a.embedding,
    1 - (a.embedding <=> query_embedding) AS similarity
  FROM allopathic a
  WHERE a.metadata @> filter
  ORDER BY a.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Create the matching function for ayurvedic medicines
CREATE OR REPLACE FUNCTION match_ayurvedic_medicines(
  query_embedding vector(768),
  match_count int DEFAULT 5,
  filter jsonb DEFAULT '{}'
)
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  embedding vector(768),
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.content,
    a.metadata,
    a.embedding,
    1 - (a.embedding <=> query_embedding) AS similarity
  FROM ayurvedic a
  WHERE a.metadata @> filter
  ORDER BY a.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
