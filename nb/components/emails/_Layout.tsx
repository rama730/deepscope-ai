
import { Html, Head, Body, Container, Section, Text, Preview, Tailwind } from '@react-email/components';

interface EmailLayoutProps {
    previewText: string;
    children: React.ReactNode;
}

export const EmailLayout = ({ previewText, children }: EmailLayoutProps) => {
    return (
        <Html>
            <Head />
            <Preview>{previewText}</Preview>
            <Tailwind>
                <Body className="bg-zinc-50 dark:bg-zinc-900 font-sans">
                    <Container className="mx-auto my-[40px] w-[465px] rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-[20px]">
                        <Section className="mt-[32px]">
                            <Text className="text-center text-[24px] font-bold text-black">NB</Text> {/* Logo Placeholder */}
                        </Section>

                        {children}

                        <Section className="mt-[32px] border-t border-zinc-200 dark:border-zinc-700 pt-[20px]">
                            <Text className="text-center text-[12px] text-zinc-500">
                                © {new Date().getFullYear()} Network for Builders. All rights reserved.
                            </Text>
                        </Section>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};
