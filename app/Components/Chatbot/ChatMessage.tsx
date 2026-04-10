import ChatbotIcon from "./ChatbotIcon";

type ChatEntry = {
  role: "user" | "model";
  text: string;
};

type ChatMessageProps = {
  chat: ChatEntry;
};

export default function ChatMessage({ chat }: ChatMessageProps) {
  const isBot = chat.role === "model";

  return (
    <div className={`message ${isBot ? "bot-message" : "user-message"}`}>
      {isBot && <ChatbotIcon />}
      <p className="message-text">{chat.text}</p>
    </div>
  );
}
