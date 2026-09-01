-- Add display_order column to collections table for custom ordering
-- This migration is optional - if the column doesn't exist, collections will be ordered by created_at

DO $$ 
BEGIN
    -- Add display_order column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'collections' 
        AND column_name = 'display_order'
    ) THEN
        ALTER TABLE public.collections 
        ADD COLUMN display_order INTEGER DEFAULT NULL;
        
        -- Create index for better performance
        CREATE INDEX IF NOT EXISTS idx_collections_display_order 
        ON public.collections(owner_id, display_order NULLS LAST);
    END IF;
END $$;
