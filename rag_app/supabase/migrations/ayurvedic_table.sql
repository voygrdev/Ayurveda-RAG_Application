-- Enable vector extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop table if it exists
DROP TABLE IF EXISTS ayurvedic;

-- Create table
CREATE TABLE ayurvedic (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,        -- For storing the content
    embedding vector(768),  -- For storing embeddings
    metadata JSONB,               -- For storing metadata
);

-- Create index on the vector column using ivfflat
CREATE INDEX ayurvedic_embedding_idx ON ayurvedic
USING ivfflat (embedding vector_cosine_ops);
