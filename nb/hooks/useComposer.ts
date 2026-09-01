import { useReducer, useCallback } from "react";

// Types
export type PostType = 'standard' | 'poll' | 'collaboration' | 'project_idea';

export interface MediaItem {
    file: File;
    preview: string;
    type: 'image' | 'video';
    uploadedUrl?: string;
}

export interface UploadProgress {
    progress: number;
    status: 'uploading' | 'converting' | 'completed' | 'error';
    message?: string;
}

export interface OpenRoleDraft {
    role: string;
    count: number;
    description: string;
    skills: string[];
}

// Initial State
export interface ComposerState {
    // UI State
    isExpanded: boolean;
    uploading: boolean;
    activeTab: PostType;

    // Content
    content: string;
    tagsInput: string;
    contentWarning: string;

    // Media
    mediaItems: MediaItem[];
    uploadProgress: Record<number, UploadProgress>;

    // Features
    pollQuestion: string;
    pollOptions: string[];
    
    collabRoles: string;
    collabSkills: string;

    // Launchpad (Project Idea)
    ideaStep: 1 | 2 | 3;
    ideaTemplateId: string;
    ideaCustomType: string;
    ideaTitle: string;
    ideaDescription: string;
    ideaLongDescription: string;
    ideaProblem: string;
    ideaSolution: string;
    ideaTags: string[];
    ideaTagInput: string;
    ideaOpenRoles: OpenRoleDraft[];
    ideaVisibility: "public" | "private";
}

export const INITIAL_STATE: ComposerState = {
    isExpanded: false,
    uploading: false,
    activeTab: 'standard',

    content: "",
    tagsInput: "",
    contentWarning: "",

    mediaItems: [],
    uploadProgress: {},

    pollQuestion: "",
    pollOptions: ["", ""],

    collabRoles: "",
    collabSkills: "",

    ideaStep: 1,
    ideaTemplateId: "startup",
    ideaCustomType: "",
    ideaTitle: "",
    ideaDescription: "",
    ideaLongDescription: "",
    ideaProblem: "",
    ideaSolution: "",
    ideaTags: [],
    ideaTagInput: "",
    ideaOpenRoles: [],
    ideaVisibility: "public"
};

// Actions
export type ComposerAction =
    | { type: 'SET_EXPANDED'; payload: boolean }
    | { type: 'SET_TYPE'; payload: PostType }
    | { type: 'SET_CONTENT'; payload: string }
    | { type: 'SET_TAGS_INPUT'; payload: string }
    | { type: 'SET_WARNING'; payload: string }
    | { type: 'SET_UPLOADING'; payload: boolean }
    
    // Media
    | { type: 'ADD_MEDIA'; payload: MediaItem[] }
    | { type: 'REMOVE_MEDIA'; payload: number } // index
    | { type: 'UPDATE_MEDIA_URL'; payload: { index: number; url: string } }
    | { type: 'SET_UPLOAD_PROGRESS'; payload: { index: number; progress: UploadProgress } }
    | { type: 'REMOVE_UPLOAD_PROGRESS'; payload: number }

    // Poll
    | { type: 'SET_POLL_QUESTION'; payload: string }
    | { type: 'SET_POLL_OPTIONS'; payload: string[] }

    // Collab
    | { type: 'SET_COLLAB_ROLES'; payload: string }
    | { type: 'SET_COLLAB_SKILLS'; payload: string }

    // Launchpad
    | { type: 'SET_IDEA_FIELD'; payload: { field: keyof ComposerState; value: any } }
    | { type: 'ADD_IDEA_TAG'; payload: string }
    | { type: 'REMOVE_IDEA_TAG'; payload: string }
    | { type: 'ADD_IDEA_ROLE'; payload: OpenRoleDraft }
    | { type: 'UPDATE_IDEA_ROLE'; payload: { index: number; role: Partial<OpenRoleDraft> } }
    | { type: 'REMOVE_IDEA_ROLE'; payload: number }
    | { type: 'RESET' }
    | { type: 'RESTORE_DRAFT'; payload: Partial<ComposerState> };

// Reducer
function composerReducer(state: ComposerState, action: ComposerAction): ComposerState {
    switch (action.type) {
        case 'SET_EXPANDED': return { ...state, isExpanded: action.payload };
        case 'SET_TYPE': return { ...state, activeTab: action.payload };
        case 'SET_CONTENT': return { ...state, content: action.payload };
        case 'SET_TAGS_INPUT': return { ...state, tagsInput: action.payload };
        case 'SET_WARNING': return { ...state, contentWarning: action.payload };
        case 'SET_UPLOADING': return { ...state, uploading: action.payload };

        case 'ADD_MEDIA': return { ...state, mediaItems: [...state.mediaItems, ...action.payload] };
        case 'REMOVE_MEDIA': return { 
            ...state, 
            mediaItems: state.mediaItems.filter((_, i) => i !== action.payload) 
        };
        case 'UPDATE_MEDIA_URL': return {
            ...state,
            mediaItems: state.mediaItems.map((item, i) => i === action.payload.index ? { ...item, uploadedUrl: action.payload.url } : item)
        };
        case 'SET_UPLOAD_PROGRESS': return {
            ...state,
            uploadProgress: { ...state.uploadProgress, [action.payload.index]: action.payload.progress }
        };
        case 'REMOVE_UPLOAD_PROGRESS': {
            const newProgress = { ...state.uploadProgress };
            delete newProgress[action.payload];
            return { ...state, uploadProgress: newProgress };
        }

        case 'SET_POLL_QUESTION': return { ...state, pollQuestion: action.payload };
        case 'SET_POLL_OPTIONS': return { ...state, pollOptions: action.payload };
        
        case 'SET_COLLAB_ROLES': return { ...state, collabRoles: action.payload };
        case 'SET_COLLAB_SKILLS': return { ...state, collabSkills: action.payload };
        
        case 'SET_IDEA_FIELD': return { ...state, [action.payload.field]: action.payload.value };
        case 'ADD_IDEA_TAG': return { ...state, ideaTags: [...state.ideaTags, action.payload] };
        case 'REMOVE_IDEA_TAG': return { ...state, ideaTags: state.ideaTags.filter(t => t !== action.payload) };
        case 'ADD_IDEA_ROLE': return { ...state, ideaOpenRoles: [...state.ideaOpenRoles, action.payload] };
        case 'UPDATE_IDEA_ROLE': return {
            ...state,
            ideaOpenRoles: state.ideaOpenRoles.map((r, i) => i === action.payload.index ? { ...r, ...action.payload.role } : r)
        };
        case 'REMOVE_IDEA_ROLE': return {
            ...state,
            ideaOpenRoles: state.ideaOpenRoles.filter((_, i) => i !== action.payload)
        };

        case 'RESET': return { ...INITIAL_STATE };
        case 'RESTORE_DRAFT': return { ...state, ...action.payload, isExpanded: true };

        default: return state;
    }
}

export function useComposer() {
    const [state, dispatch] = useReducer(composerReducer, INITIAL_STATE);

    return { state, dispatch };
}
