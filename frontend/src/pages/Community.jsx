import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Heart, ChatCircle, Plus, X, Hash, PaperPlaneTilt } from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function Community() {
  const [tab, setTab] = useState("feed");
  return (
    <div className="space-y-5 md:space-y-6" data-testid="community-page">
      <div>
        <p className="text-[10px] md:text-xs font-medium tracking-widest text-green-500 uppercase">The gang</p>
        <h1 className="text-3xl md:text-6xl font-medium tracking-tight mt-1.5 md:mt-2 text-black dark:text-white">Community.</h1>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setTab("feed")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            tab === "feed"
              ? "bg-green-600 text-black"
              : "bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-black dark:text-white"
          }`}
          data-testid="tab-feed"
        >
          Feed
        </button>
        <button
          onClick={() => setTab("channels")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            tab === "channels"
              ? "bg-green-600 text-black"
              : "bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-black dark:text-white"
          }`}
          data-testid="tab-channels"
        >
          Channels
        </button>
      </div>
      {tab === "feed" ? <Feed /> : <Channels />}
    </div>
  );
}

function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [openComments, setOpenComments] = useState({});
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState({});

  const load = async () => {
    const { data } = await api.get("/community/posts");
    setPosts(data);
  };
  useEffect(() => {
    api.get("/community/posts").then(({ data }) => setPosts(data)).catch(() => {});
  }, []);

  const submitPost = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/community/posts", { content });
      setContent("");
      setShowNew(false);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const like = async (p) => {
    await api.post(`/community/posts/${p.id}/like`);
    await load();
  };

  const toggleComments = async (p) => {
    const open = !openComments[p.id];
    setOpenComments({ ...openComments, [p.id]: open });
    if (open && !comments[p.id]) {
      const { data } = await api.get(`/community/posts/${p.id}/comments`);
      setComments({ ...comments, [p.id]: data });
    }
  };

  const submitComment = async (p) => {
    const text = newComment[p.id];
    if (!text) return;
    await api.post(`/community/posts/${p.id}/comments`, { content: text });
    const { data } = await api.get(`/community/posts/${p.id}/comments`);
    setComments({ ...comments, [p.id]: data });
    setNewComment({ ...newComment, [p.id]: "" });
    await load();
  };

  return (
    <div className="space-y-4">
      <button
        onClick={() => setShowNew(true)}
        className="inline-flex items-center gap-2 rounded-full bg-green-600 text-black px-4 py-2 text-sm font-medium"
        data-testid="new-post-button"
      >
        <Plus size={16} weight="bold" /> New post
      </button>

      <div className="space-y-3" data-testid="feed-list">
        {posts.length === 0 && (
          <div className="rounded-xl p-6 text-sm text-neutral-500 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            No posts yet. Be the first to share something!
          </div>
        )}
        {posts.map((p) => {
          const liked = p.likes?.includes(user?.id);
          return (
            <div
              key={p.id}
              className="rounded-xl p-5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800"
              data-testid={`post-${p.id}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center font-medium text-black text-sm">
                  {p.author_name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-sm text-black dark:text-white">{p.author_name}</p>
                  <p className="text-xs text-neutral-500">{new Date(p.created_at).toLocaleString()}</p>
                </div>
              </div>
              <p className="text-sm whitespace-pre-wrap text-black dark:text-neutral-200">{p.content}</p>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => like(p)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    liked
                      ? "bg-green-600 text-black"
                      : "bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-black dark:text-white"
                  }`}
                  data-testid={`like-post-${p.id}`}
                >
                  <Heart size={14} weight={liked ? "fill" : "bold"} /> {p.likes?.length || 0}
                </button>
                <button
                  onClick={() => toggleComments(p)}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-black dark:text-white"
                  data-testid={`comments-post-${p.id}`}
                >
                  <ChatCircle size={14} weight="bold" /> {p.comment_count || 0}
                </button>
              </div>
              {openComments[p.id] && (
                <div className="mt-4 border-t border-neutral-200 dark:border-neutral-800 pt-3 space-y-2">
                  {(comments[p.id] || []).map((c) => (
                    <div key={c.id} className="text-sm text-black dark:text-neutral-200">
                      <span className="font-medium">{c.author_name}: </span>
                      {c.content}
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <input
                      className="flex-1 h-10 rounded-lg px-3 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white"
                      placeholder="Write a comment…"
                      value={newComment[p.id] || ""}
                      onChange={(e) => setNewComment({ ...newComment, [p.id]: e.target.value })}
                      data-testid={`comment-input-${p.id}`}
                    />
                    <button
                      onClick={() => submitComment(p)}
                      className="rounded-lg px-3 bg-green-600 text-black"
                      data-testid={`submit-comment-${p.id}`}
                    >
                      <PaperPlaneTilt size={16} weight="bold" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showNew && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-4"
          onClick={() => setShowNew(false)}
        >
          <form
            onSubmit={submitPost}
            onClick={(e) => e.stopPropagation()}
            className="rounded-2xl p-6 w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4"
            data-testid="new-post-modal"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-medium text-black dark:text-white">Share something</h2>
              <button type="button" onClick={() => setShowNew(false)} className="text-neutral-500">
                <X size={20} weight="bold" />
              </button>
            </div>
            <textarea
              required
              rows={4}
              className="w-full rounded-lg p-3 text-sm bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white resize-none"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's happening?"
              data-testid="post-content-input"
            />
            <button
              disabled={busy}
              className="w-full h-12 rounded-xl bg-green-600 text-black font-medium disabled:opacity-50"
              data-testid="post-submit-button"
            >
              {busy ? "Posting…" : "Post"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function Channels() {
  const [channels, setChannels] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [newName, setNewName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const { user } = useAuth();

  const loadChannels = async () => {
    const { data } = await api.get("/community/channels");
    setChannels(data);
    if (!active && data[0]) setActive(data[0]);
  };
  const loadMessages = async (id) => {
    const { data } = await api.get(`/community/channels/${id}/messages`);
    setMessages(data);
  };

  useEffect(() => {
    api
      .get("/community/channels")
      .then(({ data }) => {
        setChannels(data);
        if (data[0]) setActive(data[0]);
      })
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (!active) return;
    api.get(`/community/channels/${active.id}/messages`).then(({ data }) => setMessages(data)).catch(() => {});
  }, [active]);

  const send = async (e) => {
    e.preventDefault();
    if (!text || !active) return;
    await api.post(`/community/channels/${active.id}/messages`, { content: text });
    setText("");
    loadMessages(active.id);
  };

  const createChannel = async (e) => {
    e.preventDefault();
    if (!newName) return;
    try {
      const { data } = await api.post("/community/channels", { name: newName });
      setNewName("");
      setShowCreate(false);
      await loadChannels();
      setActive(data);
    } catch (_e) {
      toast.error("Could not create channel");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4 h-[600px]">
      <div className="rounded-xl p-4 overflow-y-auto bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-medium tracking-widest text-green-500 uppercase">Channels</p>
          <button onClick={() => setShowCreate(true)} data-testid="new-channel-button" className="text-xs font-medium text-green-600 dark:text-green-500">
            + New
          </button>
        </div>
        <div className="space-y-1">
          {channels.map((c) => (
            <button
              key={c.id}
              onClick={() => setActive(c)}
              data-testid={`channel-${c.id}`}
              className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors ${
                active?.id === c.id
                  ? "bg-green-600 text-black"
                  : "bg-white dark:bg-neutral-800 text-black dark:text-white border border-neutral-200 dark:border-neutral-700"
              }`}
            >
              <Hash size={14} weight="bold" /> {c.name}
            </button>
          ))}
        </div>
        {showCreate && (
          <form onSubmit={createChannel} className="mt-3 flex gap-1">
            <input
              className="flex-1 h-9 rounded-lg px-2 text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white"
              placeholder="channel name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              data-testid="new-channel-input"
            />
            <button className="rounded-lg px-3 bg-green-600 text-black text-xs font-medium" data-testid="confirm-channel-button">
              Go
            </button>
          </form>
        )}
      </div>
      <div className="rounded-xl p-4 flex flex-col bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
        <div className="border-b border-neutral-200 dark:border-neutral-800 pb-2 mb-3">
          <p className="font-medium text-base flex items-center gap-1 text-black dark:text-white">
            <Hash size={16} weight="bold" />
            {active?.name || "select a channel"}
          </p>
          <p className="text-xs text-neutral-500">{active?.description}</p>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2" data-testid="messages-list">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`text-sm text-black dark:text-neutral-200 ${m.author_id === user?.id ? "text-right" : ""}`}
            >
              <span className="font-medium">{m.author_name}: </span>
              {m.content}
            </div>
          ))}
          {messages.length === 0 && active && <p className="text-xs text-neutral-500">No messages — start the conversation!</p>}
        </div>
        {active && (
          <form onSubmit={send} className="mt-3 flex gap-2">
            <input
              className="flex-1 h-11 rounded-lg px-3 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 outline-none focus:border-green-600 text-black dark:text-white"
              placeholder={`Message #${active.name}`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              data-testid="channel-message-input"
            />
            <button className="rounded-lg px-4 bg-green-600 text-black" data-testid="send-message-button">
              <PaperPlaneTilt size={16} weight="bold" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}