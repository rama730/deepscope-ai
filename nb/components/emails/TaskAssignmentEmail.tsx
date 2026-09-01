
import { Section, Text, Button, Heading, Hr } from '@react-email/components';
import { EmailLayout } from './_Layout';

interface TaskAssignmentEmailProps {
    assigneeName: string;
    taskTitle: string;
    projectName: string;
    assignerName: string;
    taskUrl: string;
}

export const TaskAssignmentEmail = ({
    assigneeName,
    taskTitle,
    projectName,
    assignerName,
    taskUrl,
}: TaskAssignmentEmailProps) => {
    return (
        <EmailLayout previewText={`You've been assigned a new task: ${taskTitle}`}>
            <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-black">
                New Task Assignment
            </Heading>
            <Text className="text-[14px] leading-[24px] text-zinc-900 dark:text-zinc-50">
                Hello <strong>{assigneeName}</strong>,
            </Text>
            <Text className="text-[14px] leading-[24px] text-zinc-900 dark:text-zinc-50">
                <strong>{assignerName}</strong> has assigned you to a new task in <strong>{projectName}</strong>.
            </Text>

            <Section className="my-[20px] rounded bg-zinc-100 dark:bg-zinc-900 p-4">
                <Text className="m-0 text-[16px] font-medium text-black">
                    {taskTitle}
                </Text>
            </Section>

            <Section className="mb-[32px] mt-[32px] text-center">
                <Button
                    className="rounded bg-blue-600 px-[20px] py-[12px] text-center text-[12px] font-semibold text-white no-underline"
                    href={taskUrl}
                >
                    View Task
                </Button>
            </Section>
            <Hr className="border-zinc-200 dark:border-zinc-700 my-[26px]" />
        </EmailLayout>
    );
};

export default TaskAssignmentEmail;
