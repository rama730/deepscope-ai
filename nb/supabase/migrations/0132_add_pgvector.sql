-- Enable pgvector extension
-- Note: This requires the database to support pgvector.
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to profiles
-- Using 1536 dimensions as standard for OpenAI text-embedding-ada-002
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create HNSW index for fast approximate nearest neighbor search
-- (Optional but recommended for scale)
CREATE INDEX IF NOT EXISTS profiles_embedding_idx 
ON public.profiles 
USING hnsw (embedding vector_cosine_ops);
