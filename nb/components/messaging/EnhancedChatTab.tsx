import { useMessageStore } from '@/stores/useMessageStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, CheckSquare, Link as LinkIcon, Info } from 'lucide-react';
import { MessageAttachments } from './MessageAttachments';
import TaskLink from './TaskLink';

export function EnhancedChatTab() {
    const { activeConversationId, conversations } = useMessageStore();

    if (!activeConversationId) return null;

    const messages = conversations[activeConversationId] || [];

    // Extract all attachments from conversation
    const allAttachments = messages.flatMap(m => m.attachments || []);

    // Extract unique mentioned tasks (mock logic for now if not fully in DB)
    const taskMentions = messages.flatMap(m => m.mentioned_tasks || []);
    const uniqueTasks = Array.from(new Map(taskMentions.map(t => [t.id, t])).values());

    return (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                    <Info className="w-4 h-4 text-zinc-500" />
                    Conversation Details
                </h3>
            </div>

            <Tabs defaultValue="files" className="flex-1 flex flex-col">
                <div className="px-4 pt-4">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="files" className="text-xs">
                            <FileText className="w-3.5 h-3.5 mr-1" />
                            Files
                        </TabsTrigger>
                        <TabsTrigger value="tasks" className="text-xs">
                            <CheckSquare className="w-3.5 h-3.5 mr-1" />
                            Tasks
                        </TabsTrigger>
                        <TabsTrigger value="links" className="text-xs">
                            <LinkIcon className="w-3.5 h-3.5 mr-1" />
                            Links
                        </TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="files" className="flex-1 overflow-y-auto p-4 m-0">
                    {allAttachments.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                            {/* Reuse existing attachment renderer but in grid mode if needed */}
                            <MessageAttachments attachments={allAttachments} />
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-xs text-zinc-500">No files shared yet</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="tasks" className="flex-1 overflow-y-auto p-4 m-0">
                    {uniqueTasks.length > 0 ? (
                        <div className="space-y-2">
                            {uniqueTasks.map(task => (
                                <TaskLink key={task.id} taskId={task.id} taskTitle={task.title} taskStatus={task.status} projectId={task.project_id} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-xs text-zinc-500">No tasks linked yet</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="links" className="flex-1 overflow-y-auto p-4 m-0 text-center py-8">
                    <p className="text-xs text-zinc-500">No links found in messages</p>
                </TabsContent>
            </Tabs>
        </div>
    );
}
