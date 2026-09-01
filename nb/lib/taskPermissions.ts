// Task Permission System
// Comprehensive permission rules for task management

export interface TaskPermissionContext {
  // Task info
  taskId: string;
  taskCreatorId: string;
  taskAssignedTo: string | null;
  taskStatus: "todo" | "in_progress" | "done";
  
  // User context
  currentUserId: string | null;
  projectCreatorId: string;
  isProjectMember: boolean;
}

export interface TaskPermissions {
  // Core permissions
  canView: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canComment: boolean;
  
  // Status change permissions
  canStart: boolean;
  canComplete: boolean;
  canReopen: boolean;
  
  // Assignment permissions
  canReassign: boolean;
  canSelfAssign: boolean;
  
  // Role information
  isProjectOwner: boolean;
  isTaskCreator: boolean;
  isTaskAssignee: boolean;
  
  // User-friendly messages
  viewReason: string;
  editReason: string;
  deleteReason: string;
  startReason: string;
  completeReason: string;
  reopenReason: string;
  reassignReason: string;
}

/**
 * Calculate comprehensive task permissions for a user
 */
export function getTaskPermissions(context: TaskPermissionContext): TaskPermissions {
  const {
    taskCreatorId,
    taskAssignedTo,
    taskStatus,
    currentUserId,
    projectCreatorId,
    isProjectMember,
  } = context;

  // Role checks
  const isProjectOwner = currentUserId === projectCreatorId;
  const isTaskCreator = currentUserId === taskCreatorId;
  const isTaskAssignee = currentUserId === taskAssignedTo;
  const isUnassigned = taskAssignedTo === null;

  // Initialize permissions (all false by default)
  const permissions: TaskPermissions = {
    canView: false,
    canEdit: false,
    canDelete: false,
    canComment: false,
    canStart: false,
    canComplete: false,
    canReopen: false,
    canReassign: false,
    canSelfAssign: false,
    isProjectOwner,
    isTaskCreator,
    isTaskAssignee,
    viewReason: "",
    editReason: "",
    deleteReason: "",
    startReason: "",
    completeReason: "",
    reopenReason: "",
    reassignReason: "",
  };

  // Not logged in
  if (!currentUserId) {
    permissions.viewReason = "You must be logged in to view this task";
    permissions.editReason = "You must be logged in to edit this task";
    permissions.deleteReason = "You must be logged in to delete this task";
    permissions.startReason = "You must be logged in to start this task";
    permissions.completeReason = "You must be logged in to complete this task";
    permissions.reopenReason = "You must be logged in to reopen this task";
    permissions.reassignReason = "You must be logged in to reassign this task";
    return permissions;
  }

  // Not a project member
  if (!isProjectMember) {
    permissions.viewReason = "You must be a project member to view this task";
    permissions.editReason = "You must be a project member to edit this task";
    permissions.deleteReason = "You must be a project member to delete this task";
    permissions.startReason = "You must be a project member to start this task";
    permissions.completeReason = "You must be a project member to complete this task";
    permissions.reopenReason = "You must be a project member to reopen this task";
    permissions.reassignReason = "You must be a project member to reassign this task";
    return permissions;
  }

  // ========================================
  // PERMISSION: VIEW
  // ========================================
  permissions.canView = true; // All project members can view
  permissions.viewReason = "You are a project member";

  // ========================================
  // PERMISSION: COMMENT
  // ========================================
  permissions.canComment = true; // All project members can comment
  
  // ========================================
  // PERMISSION: EDIT (Title, Description, Priority, Due Date)
  // ========================================
  if (isProjectOwner) {
    permissions.canEdit = true;
    permissions.editReason = "You are the project owner";
  } else if (isTaskCreator) {
    permissions.canEdit = true;
    permissions.editReason = "You created this task";
  } else {
    permissions.canEdit = false;
    permissions.editReason = "Only the task creator or project owner can edit this task";
  }

  // ========================================
  // PERMISSION: DELETE
  // ========================================
  if (isProjectOwner) {
    // Project owner can always delete
    permissions.canDelete = true;
    permissions.deleteReason = "You are the project owner";
  } else if (isTaskCreator) {
    // Task creator can delete if:
    // 1. Task is unassigned, OR
    // 2. Task is still in "To Do" status
    if (isUnassigned) {
      permissions.canDelete = true;
      permissions.deleteReason = "You created this task and it's unassigned";
    } else if (taskStatus === "todo") {
      permissions.canDelete = true;
      permissions.deleteReason = "You created this task and it hasn't been started";
    } else {
      permissions.canDelete = false;
      if (taskStatus === "in_progress") {
        permissions.deleteReason = "Cannot delete: Task is in progress. Contact project owner if needed.";
      } else if (taskStatus === "done") {
        permissions.deleteReason = "Cannot delete: Task is completed. Contact project owner if needed.";
      } else {
        permissions.deleteReason = "Cannot delete: Task is assigned to someone else";
      }
    }
  } else {
    permissions.canDelete = false;
    permissions.deleteReason = "Only the task creator or project owner can delete this task";
  }

  // ========================================
  // PERMISSION: START (Move to In Progress)
  // ========================================
  if (taskStatus !== "todo") {
    // Can only start tasks that are in "To Do"
    permissions.canStart = false;
    if (taskStatus === "in_progress") {
      permissions.startReason = "Task is already in progress";
    } else if (taskStatus === "done") {
      permissions.startReason = "Task is already completed. Use 'Reopen' to restart.";
    }
  } else {
    // Task is in "To Do"
    if (isProjectOwner) {
      permissions.canStart = true;
      permissions.startReason = "You are the project owner";
    } else if (isUnassigned) {
      // Unassigned tasks can be started by any member (auto-assigns)
      permissions.canStart = true;
      permissions.canSelfAssign = true;
      permissions.startReason = "This task is unassigned. Starting it will assign it to you.";
    } else if (isTaskAssignee) {
      permissions.canStart = true;
      permissions.startReason = "This task is assigned to you";
    } else {
      permissions.canStart = false;
      permissions.startReason = "This task is assigned to someone else. Only they can start it.";
    }
  }

  // ========================================
  // PERMISSION: COMPLETE (Move to Done)
  // ========================================
  if (taskStatus !== "in_progress") {
    // Can only complete tasks that are "In Progress"
    permissions.canComplete = false;
    if (taskStatus === "todo") {
      permissions.completeReason = "Task must be started before it can be completed";
    } else if (taskStatus === "done") {
      permissions.completeReason = "Task is already completed";
    }
  } else {
    // Task is "In Progress"
    if (isProjectOwner) {
      permissions.canComplete = true;
      permissions.completeReason = "You are the project owner";
    } else if (isTaskAssignee) {
      permissions.canComplete = true;
      permissions.completeReason = "This task is assigned to you";
    } else {
      permissions.canComplete = false;
      permissions.completeReason = "This task is assigned to someone else. Only they can complete it.";
    }
  }

  // ========================================
  // PERMISSION: REOPEN (Move from Done back to In Progress)
  // ========================================
  if (taskStatus === "done") {
    if (isProjectOwner) {
      permissions.canReopen = true;
      permissions.reopenReason = "You are the project owner";
    } else {
      permissions.canReopen = false;
      permissions.reopenReason = "Only the project owner can reopen completed tasks";
    }
  } else {
    permissions.canReopen = false;
    permissions.reopenReason = "Only completed tasks can be reopened";
  }

  // ========================================
  // PERMISSION: REASSIGN
  // ========================================
  if (isProjectOwner) {
    permissions.canReassign = true;
    permissions.reassignReason = "You are the project owner";
  } else if (isTaskCreator) {
    permissions.canReassign = true;
    permissions.reassignReason = "You created this task";
  } else {
    permissions.canReassign = false;
    permissions.reassignReason = "Only the task creator or project owner can reassign this task";
  }

  return permissions;
}

/**
 * Get a user-friendly permission summary for display
 */
export function getPermissionSummary(permissions: TaskPermissions): {
  role: string;
  roleColor: string;
  allowedActions: string[];
  restrictedActions: string[];
} {
  const allowedActions: string[] = [];
  const restrictedActions: string[] = [];

  // Determine role
  let role = "Project Member";
  let roleColor = "zinc";

  if (permissions.isProjectOwner) {
    role = "Project Owner";
    roleColor = "blue";
  } else if (permissions.isTaskCreator && permissions.isTaskAssignee) {
    role = "Creator & Assignee";
    roleColor = "purple";
  } else if (permissions.isTaskCreator) {
    role = "Task Creator";
    roleColor = "emerald";
  } else if (permissions.isTaskAssignee) {
    role = "Assignee";
    roleColor = "amber";
  }

  // Build action lists
  if (permissions.canView) allowedActions.push("View task");
  else restrictedActions.push("View task");

  if (permissions.canComment) allowedActions.push("Add comments");
  else restrictedActions.push("Add comments");

  if (permissions.canEdit) allowedActions.push("Edit details");
  else restrictedActions.push("Edit details");

  if (permissions.canStart) allowedActions.push("Start task");
  else restrictedActions.push("Start task");

  if (permissions.canComplete) allowedActions.push("Complete task");
  else restrictedActions.push("Complete task");

  if (permissions.canReopen) allowedActions.push("Reopen task");
  else restrictedActions.push("Reopen task");

  if (permissions.canReassign) allowedActions.push("Reassign task");
  else restrictedActions.push("Reassign task");

  if (permissions.canDelete) allowedActions.push("Delete task");
  else restrictedActions.push("Delete task");

  return {
    role,
    roleColor,
    allowedActions,
    restrictedActions,
  };
}

/**
 * Get status badge info based on role
 */
export function getRoleBadge(permissions: TaskPermissions): {
  text: string;
  color: string;
  icon: string;
} | null {
  if (permissions.isProjectOwner) {
    return {
      text: "Owner",
      color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900",
      icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    };
  }

  if (permissions.isTaskCreator && permissions.isTaskAssignee) {
    return {
      text: "Your Task",
      color: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900",
      icon: "M5 13l4 4L19 7",
    };
  }

  if (permissions.isTaskAssignee) {
    return {
      text: "Assigned to You",
      color: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900",
      icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    };
  }

  if (permissions.isTaskCreator) {
    return {
      text: "Created by You",
      color: "bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700",
      icon: "M12 4v16m8-8H4",
    };
  }

  return null;
}
