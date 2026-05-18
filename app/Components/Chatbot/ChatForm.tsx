import { useRef } from "react";

type ChatEntry = {
  role: "user" | "model";
  text: string;
};

type ChatFormProps = {
  chatHistory: ChatEntry[];
  setChatHistory: React.Dispatch<React.SetStateAction<ChatEntry[]>>;
  generateBotResponse: (history: ChatEntry[]) => void | Promise<void>;
  isLoading?: boolean;
};

export default function ChatForm({
  chatHistory,
  setChatHistory,
  generateBotResponse,
  isLoading = false,
}: ChatFormProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const MAX_MESSAGE_LENGTH = 2000;

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const input = inputRef.current;
    if (!input || isLoading) return;

    const userMessage = input.value.trim();
    if (!userMessage) return;

    if (userMessage.length > MAX_MESSAGE_LENGTH) {
      alert(`Message too long! Maximum ${MAX_MESSAGE_LENGTH} characters.`);
      return;
    }

    input.value = "";

    const nextHistory = [...chatHistory, { role: "user", text: userMessage }];
    setChatHistory([...nextHistory, { role: "model", text: "typing" }]);
    void generateBotResponse(nextHistory);
  };

  return (
    <form action="#" className="chat-form" onSubmit={handleFormSubmit}>
      <input
        ref={inputRef}
        type="text"
        placeholder="Ask me anything..."
        className="message-input"
        required
        disabled={isLoading}
        maxLength={MAX_MESSAGE_LENGTH}
      />
      <button type="submit" className="chatbot-send" aria-label="Send message" disabled={isLoading}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 5l7 7-1.4 1.4L13 8.8V19h-2V8.8L6.4 13.4 5 12z" />
        </svg>
      </button>
    </form>
  );
}
