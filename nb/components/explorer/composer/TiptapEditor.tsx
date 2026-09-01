import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import { useEffect, useRef, useState, useCallback } from 'react';
import { projectHref } from "@/lib/routing/identifiers";

type ProjectSuggestion = {
    id: string;
    title?: string | null;
    name?: string | null;
    slug?: string | null;
};

interface TiptapEditorProps {
    content: string;

    placeholder: string;
    dispatch: any; // Using any for simplicity in dispatch structure, strictly should be React.Dispatch<ComposerAction>
}

export function TiptapEditor({ content, placeholder, dispatch }: TiptapEditorProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const editor = useEditor({
        extensions: [
            StarterKit,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-blue-500 hover:underline cursor-pointer',
                },
            }),
            Placeholder.configure({
                placeholder: placeholder,
                emptyEditorClass: 'is-editor-empty before:content-[attr(data-placeholder)] before:text-zinc-400 before:float-left before:pointer-events-none before:h-0',
            }),
        ],
        content: content,
        editorProps: {
            attributes: {
                class: 'prose prose-sm dark:prose-invert focus:outline-none min-h-[80px] w-full max-w-none text-zinc-900 dark:text-zinc-100',
            },
        },
        onUpdate: ({ editor }) => {
            // We use simple text for now to maintain compatibility with existing 'content' string state
            // If we want rich text storage later, we'd switch to editor.getHTML() or editor.getJSON()
            // But preserving newlines is important.
            const text = editor.getText({ blockSeparator: '\n' });
            dispatch({ type: 'SET_CONTENT', payload: text });
        },
    });

    // /project autocomplete
    const [showProjects, setShowProjects] = useState(false);
    const [projectQuery, setProjectQuery] = useState("");
    const [projectSuggestions, setProjectSuggestions] = useState<ProjectSuggestion[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [slashStartPos, setSlashStartPos] = useState<number | null>(null);
    const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
    const cacheRef = useRef<Map<string, ProjectSuggestion[]>>(new Map());
    const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const recentProjectsKey = "recent_project_mentions";

    const readRecentProjects = useCallback((): ProjectSuggestion[] => {
        if (typeof window === "undefined") return [];
        try {
            const raw = window.localStorage.getItem(recentProjectsKey);
            const parsed = raw ? (JSON.parse(raw) as Array<{ id?: string; slug?: string; title?: string }>) : [];
            return (Array.isArray(parsed) ? parsed : [])
                .map((p) => ({
                    id: p.id || p.slug || "",
                    slug: p.slug || null,
                    title: p.title || null
                }))
                .filter((p) => !!(p.slug || p.id));
        } catch {
            return [];
        }
    }, []);

    const writeRecentProject = useCallback((project: ProjectSuggestion) => {
        if (typeof window === "undefined") return;
        const token = project.slug || project.id;
        if (!token) return;
        try {
            const current = readRecentProjects();
            const next = [
                { id: project.id, slug: project.slug || token, title: project.title || project.name || token },
                ...current.filter((p) => (p.slug || p.id) !== token)
            ].slice(0, 6);
            window.localStorage.setItem(recentProjectsKey, JSON.stringify(next));
        } catch {
            // ignore
        }
    }, [readRecentProjects]);

    const updateProjectTriggerState = useCallback(() => {
        if (!editor) return;
        const sel = editor.state.selection;
        const from = sel.from;
        const $from = sel.$from;
        const lineText = editor.state.doc.textBetween($from.start(), from, "\n", "\n");
        const match = lineText.match(/(?:^|\s)\/([A-Za-z0-9-]*)$/);
        if (!match) {
            setShowProjects(false);
            setProjectQuery("");
            setProjectSuggestions([]);
            setSelectedIndex(0);
            setSlashStartPos(null);
            return;
        }
        const q = (match[1] || "").toLowerCase();
        const start = from - q.length - 1;
        setShowProjects(true);
        setProjectQuery(q);
        setSelectedIndex(0);
        setSlashStartPos(start);

        // Position menu near cursor
        const coords = editor.view.coordsAtPos(from);
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
            setMenuPos({
                top: coords.bottom - rect.top + 6,
                left: Math.max(0, coords.left - rect.left)
            });
        }
    }, [editor]);

    // Track selection + content changes to drive /project detection
    useEffect(() => {
        if (!editor) return;
        const onSelectionUpdate = () => updateProjectTriggerState();
        const onUpdate = () => updateProjectTriggerState();
        editor.on("selectionUpdate", onSelectionUpdate);
        editor.on("update", onUpdate);
        return () => {
            editor.off("selectionUpdate", onSelectionUpdate);
            editor.off("update", onUpdate);
        };
    }, [editor, updateProjectTriggerState]);

    // Fetch projects (debounced)
    useEffect(() => {
        if (!showProjects) return;

        if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);

        if (!projectQuery) {
            setProjectSuggestions(readRecentProjects());
            return;
        }

        const cached = cacheRef.current.get(projectQuery);
        if (cached) {
            setProjectSuggestions(cached);
            return;
        }

        fetchTimeoutRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/v1/search?type=projects&q=${encodeURIComponent(projectQuery)}`);
                const json = await res.json();
                const projects = (json?.data || []).filter((x: any) => x?.type === "project");
                const normalized: ProjectSuggestion[] = projects.map((p: any) => ({
                    id: p.id,
                    title: p.title || p.name || null,
                    name: p.name || p.title || null,
                    slug: p.slug || null
                })).filter((p: any) => p?.id);
                cacheRef.current.set(projectQuery, normalized);
                setProjectSuggestions(normalized);
            } catch {
                setProjectSuggestions([]);
            }
        }, 200);

        return () => {
            if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
        };
    }, [projectQuery, showProjects, readRecentProjects]);

    const insertProject = useCallback((p: ProjectSuggestion) => {
        if (!editor) return;
        const token = p.slug || p.id;
        if (!token) return;
        const to = editor.state.selection.from;
        const from = slashStartPos ?? to;
        editor
            .chain()
            .focus()
            .insertContentAt(
                { from, to },
                [
                    {
                        type: "text",
                        text: `/${token}`,
                        marks: [{ type: "link", attrs: { href: projectHref(token) } }],
                    },
                    { type: "text", text: " " },
                ] as any
            )
            .run();
        setShowProjects(false);
        setProjectSuggestions([]);
        setProjectQuery("");
        setSelectedIndex(0);
        setSlashStartPos(null);
        writeRecentProject({ ...p, slug: p.slug || token });
        editor.commands.focus();
    }, [editor, slashStartPos, writeRecentProject]);

    // Keyboard navigation for dropdown
    useEffect(() => {
        if (!showProjects) return;
        function onKeyDown(e: KeyboardEvent) {
            if (!showProjects) return;
            if (projectSuggestions.length === 0) return;
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedIndex((prev) => Math.min(prev + 1, projectSuggestions.length - 1));
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedIndex((prev) => Math.max(prev - 1, 0));
            } else if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                const chosen = projectSuggestions[selectedIndex];
                if (chosen) insertProject(chosen);
            } else if (e.key === "Escape") {
                e.preventDefault();
                setShowProjects(false);
            }
        }
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [showProjects, projectSuggestions, selectedIndex, insertProject]);

    // Handle external updates (e.g. Draft Restore, Reset)
    useEffect(() => {
        if (editor && content !== editor.getText({ blockSeparator: '\n' })) {
            // Only update if content is significantly different to avoid cursor jumps
            // Use a naive check: if content is empty (reset) or length diff is huge (restore)

            // Ideally we compare strictly, but getText() normalizes. 
            // If the user types 'a', content becomes 'a'. editor.getText() is 'a'. No loop.
            // If we restore draft 'hello', content is 'hello'. editor is ''. We set content.

            // However, getText() strips some formatting. If we want to support Rich Text later, we need getHTML().
            // For now, since the app expects plain text 'content', getText() is safer but might strip newlines oddly.
            // Let's us try preserving the content exactly.

            // Actually, for a controlled input feel, we should setContent if it mismatches.
            // But we must preserve selection.

            // Simplification: only set if editor is empty (reset) or we determine it's a draft restore.
            // How to detect draft restore? content changes drastically.

            // Let's try standard sync:
            if (editor.getText({ blockSeparator: '\n' }) !== content) {
                // Check if the difference is just a pending keystroke? 
                // If we type 'a', onUpdate fires -> content updates -> useEffect fires. 
                // editor.getText() === content. No update.

                // If we restore draft: content updates -> useEffect fires -> editor.getText() ('') !== 'draft'. Update.
                editor.commands.setContent(content);
            }
        }
    }, [content, editor]);

    // Update placeholder when prop changes
    useEffect(() => {
        if (editor && editor.extensionManager.extensions.find((e) => e.name === 'placeholder')) {
            // Tiptap placeholder extension config is static-ish, but looking at docs it updates via extension storage or reconfig?
            // Actually, it uses the configuration passed at create.
            // We might need to destroy/recreate or find a way to update option.
            // Easier: Key the editor by placeholder? No, loses focus.
            // Tiptap logic: The extension reads the configuration.
            // We can maybe just rely on re-rendering if we really need to change placeholder dynamically for project_update.
        }
    }, [placeholder, editor]);

    return (
        <div className="w-full mb-4 relative" ref={containerRef}>
            <EditorContent editor={editor} />
            {showProjects && projectSuggestions.length > 0 && (
                <div
                    className="absolute z-50 mt-1 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg max-h-56 overflow-y-auto min-w-[260px]"
                    style={{ top: menuPos.top, left: menuPos.left }}
                >
                    <div className="px-3 py-1.5 text-[10px] font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="text-zinc-400">/</span>
                        Mention a project
                    </div>
                    {projectSuggestions.map((p, idx) => {
                        const token = p.slug || p.id;
                        return (
                            <button
                                key={`${p.id}-${token}`}
                                type="button"
                                onMouseEnter={() => setSelectedIndex(idx)}
                                onClick={() => insertProject(p)}
                                className={`w-full text-left px-3 py-2 transition-colors ${idx === selectedIndex
                                    ? "bg-indigo-50 dark:bg-indigo-950/30"
                                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
                                    }`}
                            >
                                <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                    {p.title || token}
                                </div>
                                <div className="text-xs text-zinc-500 truncate">
                                    /{token}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
