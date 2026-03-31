import { useState, useEffect, useRef } from "react";
import { Highlight, themes } from "prism-react-renderer";

// ─── Stable components defined at module scope ────────────────────────────────
// IMPORTANT: never define these inside a render/component function.
// Doing so creates a new type reference every render → React always remounts.

const CONTACTS = [
  { id: "alice", name: "Alice",   avatar: "AL", color: "#6366f1", preview: "Are you joining the standup?" },
  { id: "bob",   name: "Bob",     avatar: "BO", color: "#f43f5e", preview: "Can you review my PR?" },
];

const ChatWindow = ({ contact }) => {
  const [draft, setDraft] = useState("");
  return (
    <div style={{ display: "flex", flexDirection: "column", height: 260, background: "#fff", borderRadius: "0 0 12px 12px", border: "2px solid #e2e8f0", borderTop: "none" }}>
      <div style={{ flex: 1, padding: "14px 16px", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: contact.color + "22", color: contact.color, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{contact.avatar}</div>
          <div style={{ background: "#f1f5f9", borderRadius: "0 10px 10px 10px", padding: "8px 12px", fontSize: 14, color: "#334155", maxWidth: 260, lineHeight: 1.5 }}>
            {contact.preview}
          </div>
        </div>
      </div>
      <div style={{ borderTop: "1.5px solid #e2e8f0", padding: "10px 12px", display: "flex", gap: 10, alignItems: "center" }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder={`Message ${contact.name}...`}
          style={{ flex: 1, fontSize: 15, padding: "9px 12px", borderRadius: 8, border: "2px solid #cbd5e1", background: "#f8fafc", color: "#334155", fontFamily: "inherit", outline: "none" }}
        />
        <button style={{ background: contact.color, border: "none", borderRadius: 8, padding: "9px 14px", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>Send</button>
      </div>
    </div>
  );
};

const DisplayComponentC = ({ email }) => {
  const [localNote, setLocalNote] = useState("");
  const cb = DisplayComponentC._addLog;
  useEffect(() => {
    if (cb) cb(`fetching data for: ${email}`, "effect");
    return () => { if (cb) cb(`cleanup for: ${email}`, "cleanup"); };
  }, [email]);
  return (
    <div style={{ marginTop: 14, padding: "12px 16px", background: "#f8fafc", borderRadius: 10 }}>
      <p style={{ margin: "0 0 10px", fontSize: 16 }}>email: <strong>{email}</strong></p>
      <input
        value={localNote}
        onChange={e => setLocalNote(e.target.value)}
        placeholder="type a local note..."
        style={{ fontSize: 15, width: "100%", padding: "9px 12px", borderRadius: 8, border: "2px solid #cbd5e1", background: "#fff", color: "#334155", fontFamily: "inherit", boxSizing: "border-box" }}
      />
    </div>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

const TESTS = [
  {
    id: "a",
    tab: "Test A",
    title: "Chat — draft message persists",
    difficulty: "Medium",
    diffColor: "#f59e0b",
    question: "Type a draft message to Alice. Then switch to Bob. What do you notice about the input field?",
    code: `const ChatWindow = ({ contact }) => {
  const [draft, setDraft] = useState("");

  return (
    <div>
      {/* message history */}
      <div>{contact.preview}</div>

      {/* compose area */}
      <input
        value={draft}
        onChange={e => setDraft(e.target.value)}
        placeholder={\`Message \${contact.name}...\`}
      />
      <button>Send</button>
    </div>
  );
};

const App = () => {
  const [active, setActive] = useState("alice");
  const contact = contacts.find(c => c.id === active);

  return (
    <div>
      {/* contact list */}
      {contacts.map(c => (
        <button key={c.id} onClick={() => setActive(c.id)}>
          {c.name}
        </button>
      ))}

      {/* chat window */}
      <ChatWindow contact={contact} />
    </div>
  );
};`,
    questions: [
      "Why does the draft persist after switching contacts?",
      "Is ChatWindow unmounted and remounted, or just re-rendered with new props?",
      "A user types a long message to Alice, switches to Bob accidentally, and hits Send. What happens? How do you fix it?",
    ],
    insight: "Both contacts render <ChatWindow> at the same tree position with the same type. React reuses the instance and updates the contact prop — but never resets local state. The draft typed for Alice silently carries over to Bob. In production this is a serious bug: users can send messages to the wrong person. Fix: add key={contact.id} so React treats each contact as a distinct instance and resets state on switch.",
    fix: `{/* Adding key={contact.id} forces a full remount on every contact switch */}
<ChatWindow key={contact.id} contact={contact} />`,
    fixLabel: "key={contact.id} ensures a fresh ChatWindow — and a fresh draft — for every contact.",
    alternatives: [
      {
        title: "Lift state up",
        verdict: "valid",
        code: `const App = () => {
  const [active, setActive] = useState("alice");
  const [drafts, setDrafts] = useState({});
  const contact = contacts.find(c => c.id === active);

  return (
    <ChatWindow
      contact={contact}
      draft={drafts[active] || ""}
      onDraftChange={text =>
        setDrafts(prev => ({ ...prev, [active]: text }))
      }
    />
  );
};`,
        tradeoffs: "Preserves drafts per contact — a feature, not just a fix. But it couples the parent to ChatWindow's internal state. As ChatWindow grows (attachments, reply-to, etc.), the parent becomes a state dumping ground.",
      },
      {
        title: "useEffect reset",
        verdict: "valid",
        code: `const ChatWindow = ({ contact }) => {
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setDraft("");
  }, [contact.id]);

  return <input value={draft} onChange={e => setDraft(e.target.value)} />;
};`,
        tradeoffs: "Works without remounting, but setState inside useEffect means a render-then-clear cycle (brief flicker). You also have to remember to reset every piece of local state manually — easy to miss when someone adds new state later.",
      },
      {
        title: "React.memo",
        verdict: "trap",
        code: `const ChatWindow = React.memo(({ contact }) => {
  const [draft, setDraft] = useState("");
  return <input value={draft} onChange={e => setDraft(e.target.value)} />;
});`,
        tradeoffs: "Doesn't help. memo controls whether a component re-renders when props are the same — but here props do change (different contact). The bug is stale state carrying over, not unnecessary re-renders. memo solves a different problem entirely.",
      },
    ],
    logSequence: null,
  },
  {
    id: "cleanup",
    tab: "Test B",
    title: "useEffect cleanup lifecycle",
    difficulty: "Medium",
    diffColor: "#f59e0b",
    question: "Toggle the component on. Increment the counter a few times. Then toggle it off. Predict what logs appear and in what order before you interact.",
    code: `const Effect = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    console.log("Effect triggered with count:", count);
    return () => {
      console.log("Cleanup triggered for count:", count);
    };
  }, [count]);

  return (
    <div>
      <h1>Count: {count}</h1>
      <button onClick={() => setCount(prev => prev + 1)}>
        Increment
      </button>
    </div>
  );
};

const UseEffectCleanupTest = () => {
  const [toggle, setToggle] = useState(false);
  return (
    <div>
      <button onClick={() => setToggle(prev => !prev)}>Toggle</button>
      {toggle && <Effect />}
    </div>
  );
};`,
    questions: [
      "What value does the cleanup function see — old or new count? Why?",
      "When you increment, what is the exact order of logs?",
      "What fires when you toggle the component off?",
    ],
    insight: "The cleanup function is a closure over the render snapshot when that effect ran. On each count change: ① cleanup runs with the OLD count, then ② the new effect runs with the NEW count. On unmount, the cleanup from the last effect fires. Each effect and its cleanup are paired to the same render.",
    fix: null,
    fixLabel: null,
    logSequence: [
      { action: "toggle on",    logs: [{ text: "Effect triggered with count: 0", type: "effect" }] },
      { action: "increment → 1", logs: [{ text: "Cleanup triggered for count: 0", type: "cleanup" }, { text: "Effect triggered with count: 1", type: "effect" }] },
      { action: "increment → 2", logs: [{ text: "Cleanup triggered for count: 1", type: "cleanup" }, { text: "Effect triggered with count: 2", type: "effect" }] },
      { action: "toggle off",   logs: [{ text: "Cleanup triggered for count: 2", type: "cleanup" }] },
    ],
  },
  {
    id: "testc",
    tab: "Test C",
    title: "useEffect + positional reuse",
    difficulty: "Hard",
    diffColor: "#ef4444",
    question: "Type a note in the input. Then toggle. Does the note persist? Check the console — do you see a remount or a prop update?",
    code: `const DisplayComponent = ({ email }: { email: string }) => {
  const [localNote, setLocalNote] = useState("");

  useEffect(() => {
    console.log("fetching data for:", email);
    return () => {
      console.log("cleanup for:", email);
    };
  }, [email]);

  return (
    <div>
      <p>email: {email}</p>
      <input
        value={localNote}
        onChange={e => setLocalNote(e.target.value)}
        placeholder="local note..."
      />
    </div>
  );
};

const TestB = () => {
  const [toggleState, setToggleState] = useState(true);
  return (
    <div>
      <button onClick={() => setToggleState(prev => !prev)}>toggle</button>
      {toggleState
        ? <DisplayComponent email="a@email.com" />
        : <DisplayComponent email="b@email.com" />}
    </div>
  );
};`,
    questions: [
      "Does toggling remount the component or just update props?",
      "Why does the local note persist across toggles?",
      "How would adding key='a' / key='b' change both the logs and the input behavior?",
    ],
    insight: "Both branches render <DisplayComponent> at the same tree position. React reuses the instance and updates props — no unmount happens. Since email changed, useEffect re-runs (cleanup → effect). Local state persists because the component was never unmounted. Adding key='a' / key='b' forces a full unmount+remount: local state resets, and logs show cleanup then a fresh mount instead.",
    fix: `{toggleState
  ? <DisplayComponent key="a" email="a@email.com" />
  : <DisplayComponent key="b" email="b@email.com" />}`,
    fixLabel: "Adding keys forces full remount — local state resets, and logs show unmount/mount instead of update.",
    logSequence: [
      { action: "initial render", logs: [{ text: "fetching data for: a@email.com", type: "effect" }] },
      { action: "toggle (no key)", logs: [{ text: "cleanup for: a@email.com", type: "cleanup" }, { text: "fetching data for: b@email.com", type: "effect" }] },
      { action: "toggle back",    logs: [{ text: "cleanup for: b@email.com", type: "cleanup" }, { text: "fetching data for: a@email.com", type: "effect" }] },
    ],
  },
];

// ─── Shared UI primitives ─────────────────────────────────────────────────────

const BTN = ({ onClick, children, variant = "default", size = "md" }) => {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);
  const sizes = {
    sm: { fontSize: 13, padding: "5px 14px" },
    md: { fontSize: 15, padding: "9px 22px" },
    lg: { fontSize: 16, padding: "11px 28px" },
  };
  const variants = {
    default:      { bg: hover ? "#f1f5f9" : "#fff",    border: "#94a3b8", color: "#334155" },
    primary:      { bg: hover ? "#4f46e5" : "#6366f1", border: "#4338ca", color: "#fff"    },
    success:      { bg: hover ? "#bbf7d0" : "#dcfce7", border: "#4ade80", color: "#15803d" },
    danger:       { bg: hover ? "#fecaca" : "#fee2e2", border: "#f87171", color: "#b91c1c" },
    tab_active:   { bg: "#6366f1",                     border: "#4338ca", color: "#fff"    },
    tab_inactive: { bg: hover ? "#f8fafc" : "#fff",    border: "#cbd5e1", color: "#64748b" },
  };
  const v = variants[variant] || variants.default;
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{ ...sizes[size], background: v.bg, border: `2px solid ${v.border}`, color: v.color, borderRadius: 10, fontFamily: "inherit", fontWeight: 600, cursor: "pointer", transform: press ? "scale(0.97)" : "scale(1)", transition: "background 0.12s, transform 0.1s", display: "inline-flex", alignItems: "center", gap: 6 }}
    >{children}</button>
  );
};

function Badge({ label, color }) {
  return <span style={{ fontSize: 13, fontWeight: 700, padding: "3px 12px", borderRadius: 20, background: color + "22", color, border: `2px solid ${color}55` }}>{label}</span>;
}

function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <Highlight theme={themes.nightOwl} code={code.trim()} language="jsx">
        {({ style, tokens, getLineProps, getTokenProps }) => (
          <pre style={{ ...style, borderRadius: 12, padding: "16px 18px", fontSize: 13.5, fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Consolas, monospace", overflowX: "auto", margin: 0, lineHeight: 1.75 }}>
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })} style={{ display: "flex" }}>
                <span style={{ display: "inline-block", width: 36, textAlign: "right", paddingRight: 16, color: "#546e7a", fontSize: 12, userSelect: "none", flexShrink: 0 }}>{i + 1}</span>
                <span>
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </span>
              </div>
            ))}
          </pre>
        )}
      </Highlight>
      <div style={{ position: "absolute", top: 10, right: 10 }}>
        <BTN size="sm" onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? "✓ copied" : "copy"}</BTN>
      </div>
    </div>
  );
}

function LogLine({ text, type }) {
  const isCleanup = type === "cleanup";
  return <div style={{ fontFamily: "monospace", fontSize: 13.5, padding: "5px 10px", borderRadius: 6, background: isCleanup ? "#fef9c3" : "#dcfce7", color: isCleanup ? "#92400e" : "#15803d", marginBottom: 5, lineHeight: 1.5 }}><span style={{ opacity: 0.6, marginRight: 6 }}>{isCleanup ? "▼" : "▲"}</span>{text}</div>;
}

function ConsoleMock({ logs, onClear }) {
  return (
    <div style={{ border: "2px solid #e2e8f0", borderRadius: 12, overflow: "hidden", marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57", display: "inline-block" }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e", display: "inline-block" }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840", display: "inline-block" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b", marginLeft: 6 }}>Console</span>
        </div>
        <BTN size="sm" variant="default" onClick={onClear}>clear</BTN>
      </div>
      <div style={{ padding: "10px 12px", minHeight: 80, background: "#fff" }}>
        {logs.length === 0
          ? <span style={{ fontSize: 14, color: "#94a3b8", fontStyle: "italic" }}>No logs yet — interact above</span>
          : logs.map(l => <LogLine key={l.id} text={l.msg} type={l.type} />)}
      </div>
    </div>
  );
}

// ─── Demo A: Chat UI ──────────────────────────────────────────────────────────
function DemoA() {
  const [activeId, setActiveId] = useState("alice");
  const contact = CONTACTS.find(c => c.id === activeId);
  return (
    <div style={{ border: "2px solid #e2e8f0", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
      <div style={{ display: "flex", borderBottom: "2px solid #e2e8f0" }}>
        {CONTACTS.map(c => (
          <button
            key={c.id}
            onClick={() => setActiveId(c.id)}
            style={{
              flex: 1, display: "flex", alignItems: "center", gap: 10,
              padding: "12px 16px", background: activeId === c.id ? "#f8fafc" : "#fff",
              border: "none", borderRight: "1px solid #e2e8f0", cursor: "pointer",
              borderBottom: activeId === c.id ? `3px solid ${c.color}` : "3px solid transparent",
              transition: "background 0.1s",
            }}
          >
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: c.color + "22", color: c.color, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{c.avatar}</div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{c.name}</div>
              <div style={{ fontSize: 12, color: "#94a3b8", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.preview}</div>
            </div>
          </button>
        ))}
      </div>
      <ChatWindow contact={contact} />
    </div>
  );
}

// EffectDemo must live at module scope — if defined inside DemoCleanup,
// a new function reference is created on every render → infinite remount loop.
// The logRef pattern gives it a stable callback without re-triggering effects.
const EffectDemo = ({ logRef }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    logRef.current(`Effect triggered with count: ${count}`, "effect");
    return () => logRef.current(`Cleanup triggered for count: ${count}`, "cleanup");
  }, [count]);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 14, padding: "12px 16px", background: "#f8fafc", borderRadius: 10 }}>
      <span style={{ fontSize: 17, fontWeight: 600 }}>Count: {count}</span>
      <BTN onClick={() => setCount(p => p + 1)}>Increment</BTN>
    </div>
  );
};

// ─── Demo B: useEffect cleanup ────────────────────────────────────────────────
function DemoCleanup() {
  const [toggle, setToggle] = useState(false);
  const [logs, setLogs] = useState([]);

  // useRef keeps the callback reference stable — updating it never triggers effects
  const logRef = useRef(null);
  logRef.current = (msg, type) =>
    setLogs(prev => [...prev.slice(-29), { msg, type, id: Date.now() + Math.random() }]);

  return (
    <div>
      <BTN onClick={() => setToggle(p => !p)} variant={toggle ? "danger" : "primary"}>
        {toggle ? "⬛ Toggle OFF" : "▶ Toggle ON"}
      </BTN>
      {toggle && <EffectDemo logRef={logRef} />}
      <ConsoleMock logs={logs} onClear={() => setLogs([])} />
    </div>
  );
}

// ─── Demo C: positional reuse ─────────────────────────────────────────────────
function DemoTestC() {
  const [toggleState, setToggleState] = useState(true);
  const [logs, setLogs] = useState([{ msg: "fetching data for: a@email.com", type: "effect", id: 0 }]);
  const addLog = (msg, type) => setLogs(prev => [...prev.slice(-29), { msg, type, id: Date.now() + Math.random() }]);
  DisplayComponentC._addLog = addLog;
  return (
    <div>
      <BTN onClick={() => setToggleState(p => !p)} variant="primary">Toggle</BTN>
      {toggleState
        ? <DisplayComponentC email="a@email.com" />
        : <DisplayComponentC email="b@email.com" />}
      <ConsoleMock logs={logs} onClear={() => setLogs([])} />
    </div>
  );
}

const DEMOS = { a: DemoA, cleanup: DemoCleanup, testc: DemoTestC };

// ─── Layout ───────────────────────────────────────────────────────────────────
function Step({ n, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
      <span style={{ width: 28, height: 28, borderRadius: "50%", background: "#6366f1", color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{n}</span>
      <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#64748b" }}>{label}</span>
    </div>
  );
}

function TestPanel({ test }) {
  const [revealed, setRevealed] = useState(false);
  const Demo = DEMOS[test.id];
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#1e293b" }}>{test.title}</h2>
        <Badge label={test.difficulty} color={test.diffColor} />
      </div>

      <div style={{ border: "2px solid #e2e8f0", borderRadius: 14, padding: "18px 20px", marginBottom: 24, background: "#fff" }}>
        <Step n={1} label="Interact with the demo" />
        <p style={{ fontSize: 16, color: "#475569", margin: "0 0 16px", lineHeight: 1.7 }}>{test.question}</p>
        <Demo />
      </div>

      <div style={{ marginBottom: 24 }}>
        <Step n={2} label="Read the code" />
        <CodeBlock code={test.code} />
      </div>

      <div style={{ border: "2px solid #e2e8f0", borderRadius: 14, padding: "18px 20px", marginBottom: 24, background: "#fff" }}>
        <Step n={3} label="Answer these questions" />
        {test.questions.map((q, i) => (
          <div key={i} style={{ display: "flex", gap: 12, marginBottom: 14, alignItems: "flex-start" }}>
            <span style={{ width: 26, height: 26, borderRadius: "50%", background: "#f1f5f9", border: "2px solid #cbd5e1", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", flexShrink: 0, marginTop: 2 }}>{i + 1}</span>
            <span style={{ fontSize: 16, color: "#334155", lineHeight: 1.7 }}>{q}</span>
          </div>
        ))}
      </div>

      <BTN size="lg" variant={revealed ? "success" : "primary"} onClick={() => setRevealed(p => !p)}>
        {revealed ? "▲  Hide answer" : "▼  Reveal answer"}
      </BTN>

      {revealed && (
        <div style={{ marginTop: 22 }}>
          <div style={{ background: "#eff6ff", border: "2px solid #93c5fd", borderRadius: 12, padding: "16px 18px", marginBottom: 18 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#1d4ed8", margin: "0 0 8px" }}>Explanation</p>
            <p style={{ fontSize: 16, color: "#1e3a5f", margin: 0, lineHeight: 1.75 }}>{test.insight}</p>
          </div>

          {test.logSequence && (
            <div style={{ marginBottom: 18 }}>
              <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#64748b", margin: "0 0 10px" }}>Expected log sequence</p>
              <div style={{ border: "2px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
                {test.logSequence.map((step, i) => (
                  <div key={i} style={{ display: "flex", gap: 16, padding: "12px 16px", borderBottom: i < test.logSequence.length - 1 ? "1px solid #e2e8f0" : "none", background: i % 2 === 0 ? "#fff" : "#f8fafc", alignItems: "flex-start" }}>
                    <span style={{ fontSize: 14, color: "#94a3b8", minWidth: 150, paddingTop: 4, fontStyle: "italic" }}>{step.action}</span>
                    <div style={{ flex: 1 }}>{step.logs.map((l, j) => <LogLine key={j} text={l.text} type={l.type} />)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {test.fix && (
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#64748b", margin: "0 0 8px" }}>The fix</p>
              <p style={{ fontSize: 15, color: "#475569", margin: "0 0 10px", lineHeight: 1.7 }}>{test.fixLabel}</p>
              <CodeBlock code={test.fix} />
            </div>
          )}

          {test.alternatives && (
            <div style={{ marginTop: 18 }}>
              <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "#64748b", margin: "0 0 14px" }}>Other approaches</p>
              {test.alternatives.map((alt, i) => {
                const isTrap = alt.verdict === "trap";
                return (
                  <div key={i} style={{ border: `2px solid ${isTrap ? "#fca5a5" : "#cbd5e1"}`, borderRadius: 12, padding: "16px 18px", marginBottom: 14, background: isTrap ? "#fef2f2" : "#fff" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: isTrap ? "#b91c1c" : "#1e293b" }}>{alt.title}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 10px", borderRadius: 20, background: isTrap ? "#fee2e2" : "#dcfce7", color: isTrap ? "#b91c1c" : "#15803d", border: `1.5px solid ${isTrap ? "#fca5a5" : "#86efac"}` }}>
                        {isTrap ? "✗ doesn't help" : "✓ valid"}
                      </span>
                    </div>
                    <CodeBlock code={alt.code} />
                    <p style={{ fontSize: 14, color: isTrap ? "#991b1b" : "#475569", margin: "12px 0 0", lineHeight: 1.7 }}>{alt.tradeoffs}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [active, setActive] = useState("a");
  const test = TESTS.find(t => t.id === active);
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "2rem 1.25rem" }}>
      <h1 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 700, color: "#0f172a" }}>React — interview tests</h1>
      <p style={{ fontSize: 16, color: "#64748b", margin: "0 0 28px", lineHeight: 1.65 }}>Read the code, interact with the demo, answer the questions, then reveal the answer.</p>
      <div style={{ display: "flex", gap: 10, marginBottom: 32 }}>
        {TESTS.filter(t => t.id === "a").map(t => (
          <BTN key={t.id} onClick={() => setActive(t.id)} variant={active === t.id ? "tab_active" : "tab_inactive"} size="md">{t.tab}</BTN>
        ))}
      </div>
      <TestPanel key={active} test={test} />
    </div>
  );
}
