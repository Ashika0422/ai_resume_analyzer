import { useEffect, useState } from "react";
import ChatbotIcon from "./ChatbotIcon";
import ChatForm from "./ChatForm";
import ChatMessage from "./ChatMessage";
import "./chatbot.css";

type ChatEntry = {
  role: "user" | "model";
  text: string;
};

type Profile = {
  name: string;
  targetRole: string;
  tone: string;
  focus: string;
};

const API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const API_URL = (model: string, action: string, apiKey: string) =>
  `${API_BASE_URL}/models/${model}:${action}?key=${apiKey}`;

const CHAT_MODEL = "gemini-2.5-flash";
const EMBED_MODEL = "text-embedding-004";

const SYSTEM_PROMPT = `You are an ATS analyzer assistant for a resume screening site.
Ask for the resume and job description when missing.
Return concise, structured feedback with:
- Match summary
- Missing keywords
- Formatting issues that hurt ATS parsing
- Suggested bullet rewrites
- A rough ATS score (0-100) labeled as an estimate`;

const PROFILE_STORAGE_KEY = "ats-user-profile";
const DEFAULT_PROFILE: Profile = {
  name: "Candidate",
  targetRole: "Not specified",
  tone: "concise",
  focus: "ATS optimization",
};

const PROFILE_ALIASES: Record<string, keyof Profile> = {
  name: "name",
  role: "targetRole",
  targetrole: "targetRole",
  target_role: "targetRole",
  tone: "tone",
  focus: "focus",
};

type CommandMode = "chat" | "profile" | "embedding" | "moderation";

const parseCommand = (input: string): { mode: CommandMode; prompt: string } => {
  const trimmed = input.trim();
  if (/^\/profile\b/i.test(trimmed)) {
    return { mode: "profile", prompt: trimmed.replace(/^\/profile\s*/i, "") };
  }
  if (/^\/embed\b/i.test(trimmed)) {
    return { mode: "embedding", prompt: trimmed.replace(/^\/embed\b\s*/i, "") };
  }
  if (/^\/moderate\b/i.test(trimmed)) {
    return {
      mode: "moderation",
      prompt: trimmed.replace(/^\/moderate\b\s*/i, ""),
    };
  }
  return { mode: "chat", prompt: trimmed };
};

const getCandidateText = (data: any) => {
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  return parts
    .map((part: { text?: string }) => part?.text)
    .filter(Boolean)
    .join("");
};

const readResponseJson = async (res: Response) => {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text };
  }
};

const buildSystemPrompt = (profile: Profile) => {
  const userContext = `User profile:
- Name: ${profile.name}
- Target role: ${profile.targetRole}
- Tone: ${profile.tone}
- Focus: ${profile.focus}

Address the user by name when appropriate and match the preferred tone.`;

  return `${SYSTEM_PROMPT}

${userContext}`;
};

const parseProfileUpdate = (text: string) => {
  const updates: Partial<Profile> = {};
  const matches = text.matchAll(/(\w+)\s*=\s*("[^"]+"|\S+)/g);

  for (const match of matches) {
    const key = match[1].toLowerCase();
    const mapped = PROFILE_ALIASES[key];
    if (!mapped) continue;

    const value = match[2].replace(/^"|"$/g, "");
    if (value) updates[mapped] = value;
  }

  return updates;
};

const formatProfileSummary = (profile: Profile) =>
  `Name: ${profile.name}\nTarget role: ${profile.targetRole}\nTone: ${profile.tone}\nFocus: ${profile.focus}`;

const loadProfile = (): Profile => {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw) as Partial<Profile>;
    return { ...DEFAULT_PROFILE, ...parsed };
  } catch {
    return DEFAULT_PROFILE;
  }
};

const buildApiErrorMessage = (res: Response, data: any) => {
  const details = data?.error?.message ?? data?._raw;

  if (res.status === 401 || res.status === 403) {
    return "Invalid API key or insufficient permissions.";
  }

  if (res.status === 404) {
    return details
      ? `Model not found. ${details}`
      : "Model not found for this API version.";
  }

  if (res.status === 429) {
    return "Rate limit exceeded. Please wait and try again.";
  }

  if (res.status >= 500) {
    return "Gemini service error. Please retry later.";
  }

  return details || "Request failed. Please try again.";
};

const buildClientErrorMessage = (error: unknown) => {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return "You appear to be offline. Check your internet connection.";
  }

  if (error instanceof Error && error.message.includes("Failed to fetch")) {
    return "Network error. Check your connection or API access.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error.";
};

export default function Chatbot() {
  const [chatHistory, setChatHistory] = useState<ChatEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<Profile>(loadProfile);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(userProfile));
  }, [userProfile]);

  const updateLastBotMessage = (text: string) => {
    setChatHistory((history) => {
      const updated = [...history];
      const last = updated.length - 1;

      if (updated[last]?.role === "model" && updated[last]?.text === "Thinking...") {
        updated[last] = { role: "model", text };
        return updated;
      }

      return [...updated, { role: "model", text }];
    });
  };

  const generateBotResponse = async (history: ChatEntry[]) => {
    const lastMessage = history[history.length - 1]?.text ?? "";
    const { mode, prompt } = parseCommand(lastMessage);

    if (mode === "profile") {
      const trimmed = prompt.trim();
      if (!trimmed) {
        updateLastBotMessage(
          "Profile help: /profile name=\"Your Name\" role=\"Your Role\" tone=concise focus=\"keywords\""
        );
        return;
      }

      if (/^(reset|clear)$/i.test(trimmed)) {
        setUserProfile(DEFAULT_PROFILE);
        updateLastBotMessage("Profile reset to defaults.");
        return;
      }

      const updates = parseProfileUpdate(trimmed);
      if (!Object.keys(updates).length) {
        updateLastBotMessage(
          "Profile not updated. Use /profile name=\"Your Name\" role=\"Your Role\" tone=concise focus=\"keywords\""
        );
        return;
      }

      const nextProfile = { ...userProfile, ...updates };
      setUserProfile(nextProfile);
      updateLastBotMessage(`Profile updated:\n${formatProfileSummary(nextProfile)}`);
      return;
    }

    const apiKey = import.meta.env.VITE_API_KEY as string | undefined;

    if (!apiKey) {
      updateLastBotMessage("Missing API key. Add VITE_API_KEY to .env.");
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      updateLastBotMessage("You appear to be offline. Check your internet connection.");
      return;
    }

    try {
      if (mode === "embedding") {
        if (!prompt) {
          updateLastBotMessage("Add text after /embed. Example: /embed resume summary");
          return;
        }

        const res = await fetch(API_URL(EMBED_MODEL, "embedContent", apiKey), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: { parts: [{ text: prompt }] },
          }),
        });

        const data = await readResponseJson(res);

        if (!res.ok) throw new Error(buildApiErrorMessage(res, data));

        const values = data?.embedding?.values ?? [];

        updateLastBotMessage(
          `Embedding created. Length: ${values.length}. Preview: ${values
            .slice(0, 5)
            .join(", ")}`
        );
        return;
      }

      if (mode === "moderation") {
        if (!prompt) {
          updateLastBotMessage("Add text after /moderate. Example: /moderate resume text");
          return;
        }

        const res = await fetch(API_URL(CHAT_MODEL, "generateContent", apiKey), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `Classify this text safety:\n${prompt}` }],
              },
            ],
          }),
        });

        const data = await readResponseJson(res);

        if (!res.ok) throw new Error(buildApiErrorMessage(res, data));

        const text = getCandidateText(data);

        updateLastBotMessage(text || "No moderation response.");
        return;
      }

      const contents = history.map(({ role, text }) => ({
        role,
        parts: [{ text }],
      }));

      const res = await fetch(API_URL(CHAT_MODEL, "generateContent", apiKey), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          systemInstruction: {
            parts: [{ text: buildSystemPrompt(userProfile) }],
          },
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 800,
          },
        }),
      });

      const data = await readResponseJson(res);

      if (!res.ok) throw new Error(buildApiErrorMessage(res, data));

      const reply = getCandidateText(data);

      updateLastBotMessage(reply || "No response returned.");
    } catch (error) {
      updateLastBotMessage(`Error: ${buildClientErrorMessage(error)}`);
    }
  };

  return (
    <div className="ats-chatbot">
      {isOpen && (
        <div className="chatbot-popup" role="dialog" aria-label="ATS chatbot">
          <div className="chat-header">
            <div className="header-info">
              <ChatbotIcon />
              <h2 className="logo-text">Chatbot</h2>
            </div>
            <button
              type="button"
              className="chatbot-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close chatbot"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6.7 9.3L12 14.6l5.3-5.3 1.4 1.4L12 17.4 5.3 10.7z" />
              </svg>
            </button>
          </div>

          <div className="chat-body">
            <div className="message bot-message">
              <ChatbotIcon />
              <p className="message-text">Hello! I'm your ATS assistant.</p>
            </div>

            {chatHistory.map((chat, index) => (
              <ChatMessage key={index} chat={chat} />
            ))}
          </div>

          <div className="chat-footer">
            <ChatForm
              chatHistory={chatHistory}
              setChatHistory={setChatHistory}
              generateBotResponse={generateBotResponse}
            />
          </div>
        </div>
      )}

      <button
        type="button"
        className={`chatbot-toggle ${isOpen ? "is-hidden" : ""}`}
        onClick={() => setIsOpen(true)}
        aria-label="Open chatbot"
        aria-expanded={isOpen}
      >
        <ChatbotIcon />
      </button>
    </div>
  );
}
