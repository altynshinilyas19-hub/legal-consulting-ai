import { ChatWorkspace } from "@/components/chat/chat-workspace";
import { SectionHeading } from "@/components/section-heading";

export default function ChatPage() {
  return (
    <div className="space-y-8">
      <SectionHeading
        eyebrow="AI-консультация"
        title="Общайтесь с вашим AI-помощником по судебной практике"
        description="Ассистент отвечает в потоке, ссылается на похожие дела и сохраняет полную историю диалогов."
      />
      <ChatWorkspace />
    </div>
  );
}
