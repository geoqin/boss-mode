-- Migrate existing ongoing tasks to lists
-- Each ongoing task becomes a checkbox list, with child tasks as list items

-- Step 1: Create lists from ongoing tasks
INSERT INTO public.lists (id, user_id, name, type, sort_order, created_at)
SELECT
  gen_random_uuid(),
  t.user_id,
  t.title,
  'checkbox',
  ROW_NUMBER() OVER (PARTITION BY t.user_id ORDER BY t.created_at) - 1,
  t.created_at
FROM public.tasks t
WHERE t.ongoing = true
  AND t.parent_task_id IS NULL;

-- Step 2: Create list items from child tasks of ongoing tasks
-- We need to match each child to the list created from its parent
INSERT INTO public.list_items (id, list_id, text, depth, checked, sort_order, created_at)
SELECT
  gen_random_uuid(),
  l.id,
  child.title,
  0,
  child.completed,
  ROW_NUMBER() OVER (PARTITION BY child.parent_task_id ORDER BY child.created_at) - 1,
  child.created_at
FROM public.tasks child
JOIN public.tasks parent ON child.parent_task_id = parent.id
JOIN public.lists l ON l.name = parent.title AND l.user_id = parent.user_id
WHERE parent.ongoing = true
  AND parent.parent_task_id IS NULL;

-- Step 3: Delete child tasks of ongoing parents
DELETE FROM public.tasks
WHERE parent_task_id IN (
  SELECT id FROM public.tasks WHERE ongoing = true AND parent_task_id IS NULL
);

-- Step 4: Delete the ongoing parent tasks themselves
DELETE FROM public.tasks
WHERE ongoing = true AND parent_task_id IS NULL;
