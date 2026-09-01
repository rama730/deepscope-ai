"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createProjectSchema, type CreateProjectInput, type OpenRoleInput } from "@/lib/validations/project";
import { generateSlug, generateProjectId } from "@/lib/utils/project-ids";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { createProjectAction } from "@/app/actions/project";

export interface WizardContextType {
  openRoles: OpenRoleInput[];
  setOpenRoles: (roles: OpenRoleInput[]) => void;
  addRole: () => void;
  updateRole: (index: number, role: Partial<OpenRoleInput>) => void;
  removeRole: (index: number) => void;
}

interface UseCreateProjectWizardProps {
  onClose: () => void;
  onSuccess?: (projectId: string) => void;
  draftId?: string;
}

export function useCreateProjectWizard({ onClose, onSuccess, draftId }: UseCreateProjectWizardProps) {
  const supabase = createSupabaseBrowserClient();
  const [phase, setPhase] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [openRoles, setOpenRoles] = useState<OpenRoleInput[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Form Setup
  const methods = useForm<CreateProjectInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createProjectSchema) as any,
    mode: "onChange",
    defaultValues: {
      title: "",
      description: "",
      short_description: "",
      project_type: "",
      custom_project_type: "",
      status: "open",
      visibility: "public",
      tags: [],
      technologies_used: [],
      lifecycle_stages: [],
      current_stage_index: 0,
      problem_statement: "",
      solution_overview: "",
      target_audience: "",
      expected_start_date: "",
      expected_end_date: "",
      goals: [],
      creator_role: null, // Resolves TS error if null is allowed in schema, otherwise might need undefined
      team_settings: null,
      application_settings: {
        allow_applications: true,
        require_portfolio: false,
        custom_questions: [],
        auto_decline_days: 30,
      },
      terms: {
        ip_agreement: "discuss",
        license: "",
        nda_required: "none",
        portfolio_showcase_allowed: true,
        additional_terms: "",
      },
      external_links: {
        discord: "",
        github: "",
        website: "",
        figma: "",
        slack: "",
        notion: "",
      },
      notification_preferences: {
        on_application: true,
        on_task_complete: true,
        on_chat_message: true,
        daily_digest: false,
      },
      is_draft: false,
      metadata: {},
    },
  });

  const { getValues, trigger, formState: { isDirty }, watch } = methods;

  // Auto-Save Logic
  const allValues = watch();

  // Save Draft Function
  const saveDraft = useCallback(async (silent = false) => {
    // Don't save if not dirty and no draftId (fresh form)
    if (!isDirty && !draftId) return;

    if (!silent) {
        setIsSavingDraft(true);
        setSaveStatus("saving");
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!silent) {
            toast.error("You must be logged in");
            setSaveStatus("error");
        }
        return;
      }

      const formData = getValues();

      const payload = {
            form_data: { ...formData, openRoles }, // Store roles with form data
            current_phase: phase,
            updated_at: new Date().toISOString()
      };

      if (draftId) {
        await supabase
          .from("project_drafts")
          .update(payload)
          .eq("id", draftId);
      } else {
        if (!draftId) {
             // Create new draft
             const { data: _newDraft, error: draftError } = await supabase.from("project_drafts").insert({
                user_id: user.id,
                form_data: { ...formData, openRoles },
                current_phase: phase,
                updated_at: new Date().toISOString()
             }).select().single();
             
             // We can log error but we don't have a way to update parent draftId prop here easily
             if (draftError) {
                 console.error("Error creating draft", draftError);
             }
        }
      }

      setLastSaved(new Date());
      if (!silent) setSaveStatus("saved");

      if (!silent) {
          setTimeout(() => setSaveStatus("idle"), 2000);
      }
    } catch (error) {
      if (!silent) {
        logger.error("Error saving draft", { 
           message: error instanceof Error ? error.message : "Unknown error",
           error 
        });
        toast.error("Failed to save draft");
        setSaveStatus("error");
      }
    } finally {
      if (!silent) setIsSavingDraft(false);
    }
  }, [supabase, getValues, openRoles, phase, draftId, isDirty]);

  // Trigger auto-save when debounced values change
  useEffect(() => {
    // Only auto-save if we have a draft ID (editing a draft)
    if (!draftId) return;

    const timer = setTimeout(() => {
        saveDraft(true);
    }, 2000); // Wait 2s after changes

    return () => clearTimeout(timer);
  }, [JSON.stringify(allValues), draftId, saveDraft]);


  // Role Management
  const addRole = useCallback(() => {
    setOpenRoles((prev) => [
      {
        role: "",
        count: 1,
        description: "",
        skills: [],
        experience_level: "any",
        compensation_type: "unpaid",
        compensation_details: "",
      },
      ...prev,
    ]);
  }, []);

  const updateRole = useCallback((index: number, updates: Partial<OpenRoleInput>) => {
    setOpenRoles((prev) =>
      prev.map((role, i) => (i === index ? { ...role, ...updates } : role))
    );
  }, []);

  const removeRole = useCallback((index: number) => {
    setOpenRoles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Wizard Navigation
  const handleNext = useCallback(async () => {
    let isValid = false;

    // Validate based on phase using Zod schema keys
    if (phase === 1) {
      isValid = await trigger("project_type");
    } else if (phase === 2) {
      isValid = await trigger(["title", "description"]); 
      // Add other required fields for phase 2 if any
    } else if (phase === 3) {
      // Creator role validation
       const { creator_role } = getValues();
        if (!creator_role?.role_type || !creator_role?.title) {
            toast.error("Please complete your role information");
            return;
        }
        isValid = true; // Roles are custom state, validated manually or via check
    } else {
        isValid = true; // Other phases might not have strict blocking validation
    }

    if (isValid && phase < 5) {
      setPhase((prev) => (prev + 1) as 1 | 2 | 3 | 4 | 5);
    }
  }, [phase, trigger, getValues]);

  const handleBack = useCallback(() => {
    if (phase > 1) {
      setPhase((prev) => (prev - 1) as 1 | 2 | 3 | 4 | 5);
    }
  }, [phase]);

  const goToPhase = useCallback((p: 1 | 2 | 3 | 4 | 5) => {
    setPhase(p);
  }, []);


  // Submission
  const onSubmit = useCallback(
    async (data: CreateProjectInput) => {
      if (phase !== 5) return;

      setIsSubmitting(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error("You must be logged in");
          return;
        }

        // Generate preliminary slugs/IDs (Server will enforce uniqueness/sanitization)
        const trimmedTitle = data.title.trim();
        const baseSlug = generateSlug(trimmedTitle);
        const baseProjectId = generateProjectId(trimmedTitle);

        const payload = {
          ...data,
          slug: baseSlug, 
          project_id: baseProjectId, 
          is_draft: false,
        };

        // Use Server Action
        const result = await createProjectAction(payload);

        if (!result.success) {
           throw new Error(result.error || "Failed to create project");
        }

        const project = result.project;

        // Handle Roles - Keep separate for now, or move to action later for transactionality
        if (openRoles.length > 0) {
           // Filter valid roles
           const validRoles = openRoles.filter(r => r.role && r.role.trim());
           
           if (validRoles.length > 0) {
             const rows = validRoles.map(r => ({
                project_id: project.id,
                role: r.role.trim(),
                count: r.count || 1,
                description: r.description?.trim(),
                skills: r.skills?.filter(s => s && s.trim()) || [],
                experience_level: r.experience_level,
                compensation_type: r.compensation_type,
                compensation_details: r.compensation_details?.trim(),
             }));

             const { error: rolesError } = await supabase.from("project_open_roles").insert(rows);
             
             if (rolesError) {
                // Fix: log proper simple object for logger if type mismatch exists
                logger.error("Error inserting project roles", { message: rolesError.message, code: rolesError.code });
                toast.error("Project created, but failed to save some roles.");
             }
           }
        }

        // Cleanup Draft
        if (draftId) {
            await supabase.from("project_drafts").delete().eq("id", draftId);
        }

        toast.success("Project created successfully!");
        onSuccess?.(project.id);
        onClose();

      } catch (error: any) {
        logger.error("Error creating project", { message: error.message || String(error) });
        toast.error(error.message || "Failed to create project");
      } finally {
        setIsSubmitting(false);
      }
    },
    [supabase, openRoles, onSuccess, onClose, draftId, phase]
  );
  
  // Close Handler
  const handleCloseAttempt = useCallback(() => {
    if (isDirty || phase > 1) {
      setShowExitConfirm(true);
    } else {
      onClose();
    }
  }, [isDirty, phase, onClose]);


  const wizardContext: WizardContextType = useMemo(
    () => ({
      openRoles,
      setOpenRoles,
      addRole,
      updateRole,
      removeRole,
    }),
    [openRoles, addRole, updateRole, removeRole]
  );

  return {
      phase,
      methods,
      wizardContext,
      isSubmitting,
      isSavingDraft,
      saveStatus,
      lastSaved,
      showExitConfirm,
      setShowExitConfirm,
      handleNext,
      handleBack,
      goToPhase,
      saveDraft,
      handleCloseAttempt,
      onSubmit
  };
}
