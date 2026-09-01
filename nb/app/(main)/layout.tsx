import ConditionalLayout from "@/components/nav/ConditionalLayout";
import { LazyGlobalChatWidget } from "@/components/messaging/LazyGlobalChatWidget";

export default function MainLayout({
  children,
  modal
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <ConditionalLayout>
      {children}
      {modal}
      <LazyGlobalChatWidget />
    </ConditionalLayout>
  )
}
