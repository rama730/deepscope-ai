import { z } from "zod";
import { metadataSchema } from "./common";

/**
 * Task Validation Schemas
 */

export const taskStatusEnum = z.enum(['todo', 'in_progress', 'in_review', 'done']);
export const taskPriorityEnum = z.enum(['low', 'medium', 'high', 'urgent']);
export const taskTypeEnum = z.enum(['bug', 'feature', 'story', 'task', 'epic']);

// Sub-schemas for related entities
const subtaskSchema = z.object({
    title: z.string().min(1, "Subtask title cannot be empty")
});

const labelIdSchema = z.string().uuid();
const watcherIdSchema = z.string().uuid();

export const createTaskSchema = z.object({
  project_id: z.string().uuid("Invalid Project ID"),
  sprint_id: z.string().uuid().optional().nullable(),
  title: z.string()
    .min(3, "Title must be at least 3 characters")
    .max(200, "Title must be less than 200 characters"),
  description: z.string()
    .max(5000, "Description must be less than 5000 characters")
    .optional(),
  status: taskStatusEnum.default('todo'),
  priority: taskPriorityEnum.default('medium'),
  type: taskTypeEnum.default('task').optional(), // Optional for now as legacy modals might not send it
  story_points: z.number().int().min(0).max(100).optional().nullable(),
  tags: z.array(z.string()).default([]),
  assigned_to: z.string().uuid().optional().nullable(),
  due_date: z.string().datetime().optional().nullable(),
  metadata: metadataSchema,
  
  // Relational Data
  subtasks: z.array(subtaskSchema).default([]),
  label_ids: z.array(labelIdSchema).default([]),
  watcher_ids: z.array(watcherIdSchema).default([]),
});

export const updateTaskSchema = createTaskSchema.partial().omit({ project_id: true });

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
