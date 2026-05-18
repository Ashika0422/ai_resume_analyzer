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

const SYSTEM_PROMPT = `You are an ATS analyzer assistant for a resume screening site. Your responses must be CLEAR, STRUCTURED, and ACTIONABLE.

RESPONSE GUIDELINES:
1. **Use Clear Formatting:**
   - Use bullet points for lists
   - Use numbered steps for processes
   - Bold key points and section headers
   - Keep paragraphs short (2-3 sentences max)

2. **Be Specific & Actionable:**
   - Provide concrete examples, not vague advice
   - Give specific keywords to add
   - Suggest exact formatting changes
   - Include before/after examples when possible

3. **Structure Your Responses:**
   - Start with a brief summary
   - Provide key recommendations
   - End with next steps or call-to-action
   - Avoid long paragraphs - break into digestible chunks

4. **When Analyzing:**
   - Give a rough ATS score (0-100) with explanation
   - List missing keywords
   - Highlight formatting issues that hurt ATS parsing
   - Suggest specific bullet point rewrites
   - Provide match summary against job requirements

5. **Focus Areas:**
   - File type recommendations (DOCX vs PDF)
   - Layout simplicity (single column, no complex designs)
   - Font recommendations (Arial, Calibri, Lato, Times New Roman)
   - Keyword optimization and placement
   - Action verb usage in bullets
   - Contact info formatting

If user hasn't provided resume/job description, ask for them clearly and explain what you'll analyze.`;

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

ADDRESS USER BY NAME and match their preferred tone (${profile.tone}).

OUTPUT FORMAT - Always follow this structure:
1. Start with a clear, direct answer (1-2 sentences)
2. Use bullet points or numbered lists for key points
3. Include specific examples or recommendations
4. End with a clear next step or call-to-action

TONE: Be professional, direct, and helpful. Avoid vague language.`;

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
  const [isLoading, setIsLoading] = useState(false);

  const SUGGESTED_PROMPTS = [
    "📊 Analyze my resume for ATS optimization",
    "📝 What formatting should I use for ATS?",
    "🔍 What keywords should I add?",
    "⚡ How can I improve my ATS score?",
  ];

  const AUTO_RESPONSES: Record<string, string> = {
    hello: "👋 **Hey there!** I'm your Resume Assistant. Here's how I can help:\n\n• **Analyze Your Resume** - Share your resume & job description for ATS optimization tips\n• **Formatting Guidance** - Learn the best file types, layouts, and fonts for ATS\n• **Keyword Help** - Get specific keywords to add for better ATS matching\n• **Score Your Resume** - Get a 0-100 ATS score with actionable improvements\n\n**Ready to get started?** Just paste your resume or tell me what you need!",
    hi: "👋 **Hi there!** I'm your Resume Assistant. I can help you:\n\n✓ Optimize for ATS (Applicant Tracking Systems)\n✓ Find missing keywords\n✓ Fix formatting issues\n✓ Improve your ATS score\n\n**What would you like help with?**",
    help: "📋 **Here's what I can help with:**\n\n1. **Resume Analysis**\n   - Provide your resume & job description\n   - I'll give you an ATS score + specific feedback\n\n2. **Formatting Help**\n   - Best file types & fonts\n   - Layout recommendations\n   - What to avoid\n\n3. **Keyword Optimization**\n   - Which keywords to add\n   - Where to place them\n   - How to naturally integrate them\n\n4. **Specific Feedback**\n   - ATS parsing issues\n   - Bullet point rewrites\n   - Match analysis vs job description\n\n**Ready?** Share your resume or ask a specific question!",
    thanks: "✅ **You're welcome!** Anything else I can help optimize?",
    thank: "✅ **Happy to help!** Got more questions or need further analysis? Just ask!",
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(userProfile));
  }, [userProfile]);

  const updateLastBotMessage = (text: string) => {
    setChatHistory((history) => {
      const updated = [...history];
      const last = updated.length - 1;

      if (updated[last]?.role === "model" && (updated[last]?.text === "Thinking..." || updated[last]?.text === "typing")) {
        updated[last] = { role: "model", text };
        return updated;
      }

      return [...updated, { role: "model", text }];
    });
    setIsLoading(false);
  };

  const handleClearHistory = () => {
    if (confirm("Clear all messages? This cannot be undone.")) {
      setChatHistory([]);
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    const nextHistory: ChatEntry[] = [...chatHistory, { role: "user", text: prompt }];
    const typingEntry: ChatEntry = { role: "model", text: "typing" };
    setChatHistory([...nextHistory, typingEntry]);
    setIsLoading(true);
    void generateBotResponse(nextHistory);
  };

  const generateBotResponse = async (history: ChatEntry[]) => {
    setIsLoading(true);
    const lastMessage = history[history.length - 1]?.text ?? "";
    const { mode, prompt } = parseCommand(lastMessage);

    // Check for auto-responses
    const lowerLastMessage = lastMessage.toLowerCase().trim();
    for (const [key, response] of Object.entries(AUTO_RESPONSES)) {
      if (lowerLastMessage.includes(key)) {
        updateLastBotMessage(response);
        return;
      }
    }

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
            temperature: 0.3,
            topP: 0.85,
            maxOutputTokens: 1200,
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
        <>
          <div className="chatbot-backdrop" onClick={() => setIsOpen(false)}></div>
          <div className="chatbot-popup" role="dialog" aria-label="ATS chatbot">
          <div className="chat-header">
            <div className="header-info">
              <ChatbotIcon />
              <h2 className="logo-text">Resume Assistant</h2>
            </div>
            <div className="header-buttons">
              {chatHistory.length > 0 && (
                <button
                  type="button"
                  className="clear-history-btn"
                  onClick={handleClearHistory}
                  aria-label="Clear chat history"
                  title="Clear all messages"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                className="chatbot-close"
                onClick={() => setIsOpen(false)}
                aria-label="Close chatbot"
                title="Close Chat"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="chat-body">
            <div className="message bot-message">
              <ChatbotIcon />
              <p className="message-text">
                👋 Hi {userProfile.name}! I'm your Resume Assistant. How can I help optimize your resume for ATS today?
              </p>
            </div>

            {chatHistory.length === 0 && (
              <div className="suggested-prompts">
                {SUGGESTED_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    className="suggested-prompt-btn"
                    onClick={() => handleSuggestedPrompt(prompt)}
                  >
                    💡 {prompt}
                  </button>
                ))}
              </div>
            )}

            {chatHistory.map((chat, index) => (
              <div key={index}>
                {chat.text === "typing" ? (
                  <div className="message bot-message">
                    <ChatbotIcon />
                    <div className="typing-indicator">
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                    </div>
                  </div>
                ) : (
                  <ChatMessage chat={chat} />
                )}
              </div>
            ))}
          </div>

          <div className="chat-footer">
            <ChatForm
              chatHistory={chatHistory}
              setChatHistory={setChatHistory}
              generateBotResponse={generateBotResponse}
              isLoading={isLoading}
            />
          </div>
          </div>
        </>
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
