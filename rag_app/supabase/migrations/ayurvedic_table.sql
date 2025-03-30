-- Enable vector extension if it doesn't exist
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop table if it exists
DROP TABLE IF EXISTS ayurvedic;

-- Create table
CREATE TABLE ayurvedic (
    id BIGSERIAL PRIMARY KEY,
    content_vector vector(1536),  -- For storing embeddings
    metadata JSONB,               -- For storing metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on the vector column using ivfflat
CREATE INDEX ayurvedic_content_vector_idx ON ayurvedic
USING ivfflat (content_vector vector_cosine_ops);
