
import { Section, Text, Button, Heading, Hr } from '@react-email/components';
import { EmailLayout } from './_Layout';

interface ProjectInviteEmailProps {
    inviteeName: string;
    projectName: string;
    inviterName: string;
    projectUrl: string;
}

export const ProjectInviteEmail = ({
    inviteeName,
    projectName,
    inviterName,
    projectUrl,
}: ProjectInviteEmailProps) => {
    return (
        <EmailLayout previewText={`You've been invited to join ${projectName}`}>
            <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-black">
                Project Invitation
            </Heading>
            <Text className="text-[14px] leading-[24px] text-zinc-900 dark:text-zinc-50">
                Hello <strong>{inviteeName}</strong>,
            </Text>
            <Text className="text-[14px] leading-[24px] text-zinc-900 dark:text-zinc-50">
                <strong>{inviterName}</strong> has invited you to join the project <strong>{projectName}</strong> as a collaborator.
            </Text>

            <Section className="mb-[32px] mt-[32px] text-center">
                <Button
                    className="rounded bg-black px-[20px] py-[12px] text-center text-[12px] font-semibold text-white no-underline"
                    href={projectUrl}
                >
                    Join Project
                </Button>
            </Section>
            <Hr className="border-zinc-200 dark:border-zinc-700 my-[26px]" />
        </EmailLayout>
    );
};

export default ProjectInviteEmail;
