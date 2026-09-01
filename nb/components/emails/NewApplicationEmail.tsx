
import { Section, Text, Button, Heading, Hr } from '@react-email/components';
import { EmailLayout } from './_Layout';

interface NewApplicationEmailProps {
    creatorName: string;
    applicantName: string;
    projectName: string;
    roleAppliedFor: string;
    applicationUrl: string;
}

export const NewApplicationEmail = ({
    creatorName,
    applicantName,
    projectName,
    roleAppliedFor,
    applicationUrl,
}: NewApplicationEmailProps) => {
    return (
        <EmailLayout previewText={`New Application for ${projectName}: ${applicantName}`}>
            <Heading className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-black">
                New Lead / Application
            </Heading>
            <Text className="text-[14px] leading-[24px] text-zinc-900 dark:text-zinc-50">
                Hello <strong>{creatorName}</strong>,
            </Text>
            <Text className="text-[14px] leading-[24px] text-zinc-900 dark:text-zinc-50">
                Good news! <strong>{applicantName}</strong> has applied for the role of <strong>{roleAppliedFor}</strong> in your project <strong>{projectName}</strong>.
            </Text>

            <Section className="mb-[32px] mt-[32px] text-center">
                <Button
                    className="rounded bg-indigo-600 px-[20px] py-[12px] text-center text-[12px] font-semibold text-white no-underline"
                    href={applicationUrl}
                >
                    Review Application
                </Button>
            </Section>
            <Hr className="border-zinc-200 dark:border-zinc-700 my-[26px]" />
        </EmailLayout>
    );
};

export default NewApplicationEmail;
