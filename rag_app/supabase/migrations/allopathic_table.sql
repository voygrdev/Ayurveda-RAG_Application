-- Enable vector extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop table if it exists
DROP TABLE IF EXISTS allopathic;

-- Create table
CREATE TABLE allopathic (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,        -- For storing the content
    embedding vector(768),  -- For storing embeddings
    metadata JSONB,               -- For storing metadata
);

-- Create index on the vector column using ivfflat
CREATE INDEX allopathic_embedding_idx ON allopathic
USING ivfflat (embedding vector_cosine_ops);

