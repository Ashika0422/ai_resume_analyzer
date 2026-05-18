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

  const renderInline = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={`bold-${index}`}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const renderMessage = (text: string) => {
    const lines = text.replace(/\r\n/g, "\n").split("\n");
    const blocks: JSX.Element[] = [];
    let i = 0;
    let blockIndex = 0;

    while (i < lines.length) {
      const line = lines[i].trim();
      if (!line) {
        i += 1;
        continue;
      }

      const bulletMatch = line.match(/^([-*•]|✓)\s+(.*)/);
      const numberMatch = line.match(/^\d+[.)]\s+(.*)/);

      if (bulletMatch) {
        const items: string[] = [];
        while (i < lines.length) {
          const match = lines[i].trim().match(/^([-*•]|✓)\s+(.*)/);
          if (!match) break;
          items.push(match[2]);
          i += 1;
        }
        blocks.push(
          <ul key={`ul-${blockIndex++}`}>
            {items.map((item, index) => (
              <li key={`li-${index}`}>{renderInline(item)}</li>
            ))}
          </ul>
        );
        continue;
      }

      if (numberMatch) {
        const items: string[] = [];
        while (i < lines.length) {
          const match = lines[i].trim().match(/^\d+[.)]\s+(.*)/);
          if (!match) break;
          items.push(match[1]);
          i += 1;
        }
        blocks.push(
          <ol key={`ol-${blockIndex++}`}>
            {items.map((item, index) => (
              <li key={`li-${index}`}>{renderInline(item)}</li>
            ))}
          </ol>
        );
        continue;
      }

      const paragraphLines: string[] = [];
      while (i < lines.length) {
        const current = lines[i].trim();
        if (!current) {
          i += 1;
          break;
        }
        if (current.match(/^([-*•]|✓)\s+/) || current.match(/^\d+[.)]\s+/)) {
          break;
        }
        paragraphLines.push(current);
        i += 1;
      }

      blocks.push(
        <p key={`p-${blockIndex++}`}>{renderInline(paragraphLines.join(" "))}</p>
      );
    }

    return blocks.length ? blocks : <p>{renderInline(text)}</p>;
  };

  return (
    <div className={`message ${isBot ? "bot-message" : "user-message"}`}>
      {isBot && <ChatbotIcon />}
      <div className="message-text">{renderMessage(chat.text)}</div>
    </div>
  );
}
