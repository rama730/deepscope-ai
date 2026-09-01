-- Enable REPLICA IDENTITY FULL for bookmarks to get full old record on DELETE
ALTER TABLE public.bookmarks REPLICA IDENTITY FULL;
