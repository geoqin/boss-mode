-- Create lists table for the Lists widget
CREATE TABLE IF NOT EXISTS public.lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'bullet' CHECK (type IN ('bullet', 'checkbox')),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create list items table
CREATE TABLE IF NOT EXISTS public.list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE,
  text TEXT NOT NULL DEFAULT '',
  depth INTEGER DEFAULT 0 CHECK (depth >= 0 AND depth <= 2),
  checked BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lists
CREATE POLICY "Users can view their own lists"
  ON public.lists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own lists"
  ON public.lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lists"
  ON public.lists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lists"
  ON public.lists FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for list_items (through list ownership)
CREATE POLICY "Users can view items in their lists"
  ON public.list_items FOR SELECT
  USING (list_id IN (SELECT id FROM public.lists WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert items in their lists"
  ON public.list_items FOR INSERT
  WITH CHECK (list_id IN (SELECT id FROM public.lists WHERE user_id = auth.uid()));

CREATE POLICY "Users can update items in their lists"
  ON public.list_items FOR UPDATE
  USING (list_id IN (SELECT id FROM public.lists WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete items in their lists"
  ON public.list_items FOR DELETE
  USING (list_id IN (SELECT id FROM public.lists WHERE user_id = auth.uid()));
