
import { Section, Text, Button, Heading, Hr } from '@react-email/components';
import { EmailLayout } from './_Layout';

interface ApplicationDecisionEmailProps {
    applicantName: string;
    projectName: string;
    status: 'accepted' | 'rejected';
    projectUrl: string;
}

export const ApplicationDecisionEmail = ({
    applicantName,
    projectName,
    status,
    projectUrl,
}: ApplicationDecisionEmailProps) => {
    const isAccepted = status === 'accepted';
    const color = isAccepted ? 'text-green-600' : 'text-red-500';
    const title = isAccepted ? 'You are in!' : 'Application Update';

    return (
        <EmailLayout previewText={`Update on your application to ${projectName}`}>
            <Heading className={`mx-0 my-[30px] p-0 text-center text-[24px] font-normal ${color}`}>
                {title}
            </Heading>
            <Text className="text-[14px] leading-[24px] text-zinc-900 dark:text-zinc-50">
                Hello <strong>{applicantName}</strong>,
            </Text>
            <Text className="text-[14px] leading-[24px] text-zinc-900 dark:text-zinc-50">
                Your application to join <strong>{projectName}</strong> has been <strong>{status}</strong>.
            </Text>

            {isAccepted && (
                <Section className="mb-[32px] mt-[32px] text-center">
                    <Button
                        className="rounded bg-green-600 px-[20px] py-[12px] text-center text-[12px] font-semibold text-white no-underline"
                        href={projectUrl}
                    >
                        Go to Project Dashboard
                    </Button>
                </Section>
            )}

            {!isAccepted && (
                <Text className="text-[14px] leading-[24px] text-zinc-500 italic">
                    Don't be discouraged! There are many other projects looking for builders like you.
                </Text>
            )}

            <Hr className="border-zinc-200 dark:border-zinc-700 my-[26px]" />
        </EmailLayout>
    );
};

export default ApplicationDecisionEmail;
