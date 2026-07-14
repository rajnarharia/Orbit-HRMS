// src/components/ChatBot.jsx
import { useMemo, useRef, useState } from 'react';
import api from '../api';

const STARTER_MESSAGES = [
  {
    role: 'assistant',
    content: 'Hi, I am your HRMS help bot. Ask me about attendance, leave, payroll, profile, resume, or settings.'
  }
];

function BotIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <rect x="5" y="6" width="14" height="11" rx="4" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 17l-2 3M16 17l2 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="9.5" cy="11.5" r="1" fill="currentColor" />
      <circle cx="14.5" cy="11.5" r="1" fill="currentColor" />
      <path d="M10 14h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function getFallbackReply(text) {
  const q = text.toLowerCase();
  if (q.includes('leave') || q.includes('time off')) {
    return 'Open Time Off from the sidebar, fill your leave type and dates, then submit the request. You can also check your leave balance there.';
  }
  if (q.includes('attendance') || q.includes('check in') || q.includes('check out')) {
    return 'Open Attendance from the sidebar to check in, check out, and review your attendance records.';
  }
  if (q.includes('password') || q.includes('setting')) {
    return 'Open Settings from the top-right profile menu, then use Change Password.';
  }
  if (q.includes('profile') || q.includes('photo') || q.includes('resume')) {
    return 'Open My Profile from the top-right menu. You can edit profile details, upload a photo, and manage resume details there.';
  }
  if (q.includes('salary') || q.includes('payroll')) {
    return 'Payroll details are available in the profile salary section. Admins can edit salary structure; employees can view their own details.';
  }
  if (q.includes('employee') || q.includes('admin')) {
    return 'Admins can open Employees from the sidebar to view employees, add new employees, and manage profiles.';
  }
  return 'I can help with HRMS tasks like attendance, leave requests, profile photo, resume, payroll, password settings, and employee management.';
}

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState(STARTER_MESSAGES);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const apiMessages = useMemo(
    () => messages.filter((m) => ['user', 'assistant'].includes(m.role)).slice(-8),
    [messages]
  );

  function toggleOpen() {
    setOpen((value) => {
      const next = !value;
      if (next) setTimeout(() => inputRef.current?.focus(), 50);
      return next;
    });
  }

  async function handleSend(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || loading) return;

    const nextMessages = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setDraft('');
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/chat', {
        messages: [...apiMessages, { role: 'user', content: text }]
      });
      setMessages([...nextMessages, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setError(`${err.message} Showing quick offline help until the backend is running.`);
      setMessages([...nextMessages, { role: 'assistant', content: getFallbackReply(text) }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`chatbot ${open ? 'open' : ''}`}>
      {open && (
        <section className="chatbot-panel" aria-label="HRMS help chat">
          <div className="chatbot-header">
            <div className="chatbot-title">
              <span className="chatbot-mark"><BotIcon /></span>
              <div>
                <strong>HRMS Help</strong>
                <span>Powered by Groq</span>
              </div>
            </div>
            <button className="chatbot-close" type="button" onClick={toggleOpen} aria-label="Close chatbot">x</button>
          </div>

          <div className="chatbot-messages">
            {messages.map((message, index) => (
              <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}>
                {message.content}
              </div>
            ))}
            {loading && <div className="chat-message assistant typing">Thinking...</div>}
          </div>

          {error && <div className="chatbot-error">{error}</div>}

          <form className="chatbot-input" onSubmit={handleSend}>
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask for help..."
              disabled={loading}
            />
            <button type="submit" disabled={loading || !draft.trim()}>Send</button>
          </form>
        </section>
      )}

      <button className="chatbot-toggle" type="button" onClick={toggleOpen} aria-label="Open HRMS help chatbot">
        <BotIcon />
      </button>
    </div>
  );
}
