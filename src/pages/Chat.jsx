import {
  AlertCircle,
  ArrowLeft,
  LoaderCircle,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
} from "lucide-react";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { useChats } from "../context/ChatsContext";
import "../styles/chat.css";

function Chat({
  character,
  onBack,
}) {
  const {
    getCharacterMessages,
    getConversation,
    isConversationLoading,
    isCharacterStreaming,
    startConversation,
    addMessage,
    generateCharacterReply,
  } = useChats();

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    isTyping,
    setIsTyping,
  ] = useState(false);

  const [
    sending,
    setSending,
  ] = useState(false);

  const [
    sendError,
    setSendError,
  ] = useState("");

  const messagesEndRef =
    useRef(null);

  const messages =
    getCharacterMessages(
      character.id
    );

  const conversation =
    getConversation(
      character.id
    );

  const conversationLoading =
    isConversationLoading(
      character.id
    );

  const characterStreaming =
    isCharacterStreaming(
      character.id
    );

  const conversationReady =
    Boolean(
      conversation
        ?.conversationId
    );

  const latestMessageContent =
    messages[
      messages.length - 1
    ]?.content || "";

  const showTypingIndicator =
    isTyping &&
    !characterStreaming;

  useEffect(() => {
    startConversation(
      character
    ).catch(
      (error) => {
        console.error(
          "Conversation initialization failed:",
          error
        );
      }
    );
  }, [character.id]);

  useEffect(() => {
    messagesEndRef
      .current
      ?.scrollIntoView({
        behavior:
          characterStreaming
            ? "auto"
            : "smooth",
      });
  }, [
    messages.length,
    latestMessageContent,
    isTyping,
    conversationLoading,
    characterStreaming,
  ]);

  async function retryConversation() {
    setSendError("");

    try {
      await startConversation(
        character
      );
    } catch (error) {
      console.error(
        "Conversation retry failed:",
        error
      );
    }
  }

  async function handleSubmit(
    event
  ) {
    event.preventDefault();

    const cleanMessage =
      message.trim();

    if (
      !cleanMessage ||
      sending ||
      isTyping ||
      characterStreaming ||
      !conversationReady
    ) {
      return;
    }

    try {
      setSending(true);
      setSendError("");

      await addMessage(
        character.id,
        "user",
        cleanMessage
      );

      setMessage("");
      setSending(false);
      setIsTyping(true);

      await generateCharacterReply(
        character.id
      );
    } catch (error) {
      console.error(
        "Error generating character response:",
        error
      );

      setSendError(
        translateMessageError(
          error.message
        )
      );
    } finally {
      setSending(false);
      setIsTyping(false);
    }
  }

  function handleKeyDown(
    event
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      handleSubmit(event);
    }
  }

  return (
    <section className="chat">
      <header className="chat__header">
        <button
          className="chat__icon-button"
          onClick={onBack}
          aria-label="Go back"
        >
          <ArrowLeft
            size={20}
          />
        </button>

        <div className="chat__avatar">
          {character.initials}
        </div>

        <div className="chat__identity">
          <strong>
            {character.name}
          </strong>

          <span>
            {conversationLoading
              ? "Opening conversation..."
              : isTyping ||
                  characterStreaming
                ? "Writing..."
                : character.style}
          </span>
        </div>

        <button
          className="chat__icon-button chat__more"
          aria-label="Conversation options"
        >
          <MoreHorizontal
            size={20}
          />
        </button>
      </header>

      <div className="chat__content">
        <div className="chat__introduction">
          <div className="chat__large-avatar">
            <span>
              {character.initials}
            </span>
          </div>

          <h1>
            {character.name}
          </h1>

          <p>
            {character.description ||
              character.role}
          </p>

          <span className="chat__relationship">
            {character.relationship ||
              "Your story begins here"}
          </span>
        </div>

        {conversationLoading && (
          <div className="chat__status">
            <LoaderCircle
              className="chat__status-spinner"
              size={25}
            />

            <h2>
              Opening your story
            </h2>

            <p>
              Preparing your private
              conversation...
            </p>
          </div>
        )}

        {!conversationLoading &&
          conversation?.error &&
          !conversationReady && (
            <div className="chat__status chat__status--error">
              <AlertCircle
                size={27}
              />

              <h2>
                We couldn't open this
                story
              </h2>

              <p>
                {conversation.error}
              </p>

              <button
                onClick={
                  retryConversation
                }
              >
                <RefreshCw
                  size={16}
                />

                Try again
              </button>
            </div>
          )}

        {!conversationLoading &&
          conversationReady && (
            <div
              className="chat__messages"
              aria-live="polite"
            >
              {messages.map(
                (chatMessage) => (
                  <article
                    key={
                      chatMessage.id
                    }
                    className={
                      `chat-message ` +
                      `chat-message--${chatMessage.sender}` +
                      (
                        chatMessage
                          .isStreaming
                          ? " chat-message--streaming"
                          : ""
                      )
                    }
                  >
                    {chatMessage.sender ===
                      "character" && (
                      <span className="chat-message__avatar">
                        {
                          character.initials
                        }
                      </span>
                    )}

                    <p>
                      {
                        chatMessage.content
                      }

                      {chatMessage
                        .isStreaming && (
                        <span
                          className="chat-message__cursor"
                          aria-hidden="true"
                        >
                          ▍
                        </span>
                      )}
                    </p>
                  </article>
                )
              )}

              {showTypingIndicator && (
                <article className="chat-message chat-message--character">
                  <span className="chat-message__avatar">
                    {
                      character.initials
                    }
                  </span>

                  <div className="typing-indicator">
                    <span />
                    <span />
                    <span />
                  </div>
                </article>
              )}

              {sendError && (
                <div className="chat__send-error">
                  <AlertCircle
                    size={16}
                  />

                  <span>
                    {sendError}
                  </span>
                </div>
              )}

              <div
                ref={
                  messagesEndRef
                }
              />
            </div>
          )}
      </div>

      <form
        className="chat__composer"
        onSubmit={
          handleSubmit
        }
      >
        <button
          type="button"
          className="chat__add-button"
          disabled={
            !conversationReady ||
            isTyping ||
            characterStreaming
          }
          aria-label="Add context"
        >
          <Plus
            size={20}
          />
        </button>

        <textarea
          value={message}
          onChange={
            (event) => {
              setMessage(
                event.target.value
              );

              setSendError("");
            }
          }
          onKeyDown={
            handleKeyDown
          }
          placeholder={
            conversationLoading
              ? "Opening conversation..."
              : conversationReady
                ? `Message ${character.name}...`
                : "Conversation unavailable"
          }
          rows="1"
          disabled={
            !conversationReady ||
            sending ||
            isTyping ||
            characterStreaming
          }
        />

        <button
          type="submit"
          className="chat__send-button"
          disabled={
            !message.trim() ||
            sending ||
            isTyping ||
            characterStreaming ||
            !conversationReady
          }
          aria-label="Send message"
        >
          {sending ||
          isTyping ||
          characterStreaming ? (
            <Sparkles
              size={18}
            />
          ) : (
            <Send
              size={18}
            />
          )}
        </button>
      </form>
    </section>
  );
}

function translateMessageError(
  message = ""
) {
  const error =
    message.toLowerCase();

  if (
    error.includes(
      "row-level security"
    ) ||
    error.includes(
      "permission"
    )
  ) {
    return "Your account doesn't have permission to save this message.";
  }

  if (
    error.includes(
      "authentication"
    ) ||
    error.includes(
      "invalid session"
    ) ||
    error.includes("jwt") ||
    error.includes(
      "session expired"
    )
  ) {
    return "Your session expired. Sign in again.";
  }

  if (
    error.includes("quota") ||
    error.includes(
      "rate limit"
    ) ||
    error.includes(
      "resource_exhausted"
    )
  ) {
    return "The free AI limit was reached. Try again later.";
  }

  if (
    error.includes(
      "network"
    ) ||
    error.includes(
      "failed to fetch"
    )
  ) {
    return "We couldn't connect to the AI service.";
  }

  if (
    error.includes(
      "conversation is not ready"
    )
  ) {
    return "Wait until the conversation finishes loading.";
  }

  if (
    error.includes(
      "empty response"
    ) ||
    error.includes(
      "response ended"
    )
  ) {
    return "The character's response was interrupted. Try again.";
  }

  return (
    message ||
    "The character couldn't respond."
  );
}

export default Chat;