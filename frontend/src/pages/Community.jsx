import { useEffect, useState } from "react";
import api, { ACCENTS } from "@/lib/api";
import { Heart, ChatCircle, Plus, X, Hash, PaperPlaneTilt } from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function Community() {
  const [tab, setTab] = useState("feed");
  return (
    <div className="space-y-6" data-testid="community-page">
      <div>
        <p className="overline text-neutral-500">THE GANG</p>
        <h1 className="text-5xl md:text-6xl font-black tracking-tighter mt-2">Community.</h1>
      </div>
      <div className="flex gap-2">
        <button onClick={() => setTab("feed")} className={`nb-btn ${tab === "feed" ? "text-white" : "bg-white"}`} style={tab === "feed" ? { backgroundColor: ACCENTS.community } : {}} data-testid="tab-feed">Feed</button>
        <button onClick={() => setTab("channels")} className={`nb-btn ${tab === "channels" ? "text-white" : "bg-white"}`} style={tab === "channels" ? { backgroundColor: ACCENTS.community } : {}} data-testid="tab-channels">Channels</button>
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
    } finally { setBusy(false); }
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
      <button onClick={() => setShowNew(true)} className="nb-btn text-white" style={{ backgroundColor: ACCENTS.community }} data-testid="new-post-button">
        <Plus size={18} weight="bold" /> New Post
      </button>

      <div className="space-y-3" data-testid="feed-list">
        {posts.length === 0 && <div className="nb-card p-6 text-sm text-neutral-500">No posts yet. Be the first to share something!</div>}
        {posts.map((p) => {
          const liked = p.likes?.includes(user?.id);
          return (
            <div key={p.id} className="nb-card p-5" data-testid={`post-${p.id}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full border-2 border-black bg-[#FFCD00] flex items-center justify-center font-black">
                  {p.author_name?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-sm">{p.author_name}</p>
                  <p className="text-xs text-neutral-500">{new Date(p.created_at).toLocaleString()}</p>
                </div>
              </div>
              <p className="text-base whitespace-pre-wrap">{p.content}</p>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => like(p)}
                  className={`nb-btn text-sm ${liked ? "" : "bg-white"}`}
                  style={liked ? { backgroundColor: ACCENTS.alert, color: "white" } : {}}
                  data-testid={`like-post-${p.id}`}
                >
                  <Heart size={16} weight={liked ? "fill" : "bold"} /> {p.likes?.length || 0}
                </button>
                <button onClick={() => toggleComments(p)} className="nb-btn text-sm bg-white" data-testid={`comments-post-${p.id}`}>
                  <ChatCircle size={16} weight="bold" /> {p.comment_count || 0}
                </button>
              </div>
              {openComments[p.id] && (
                <div className="mt-4 border-t-2 border-black pt-3 space-y-2">
                  {(comments[p.id] || []).map((c) => (
                    <div key={c.id} className="text-sm">
                      <span className="font-bold">{c.author_name}: </span>{c.content}
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <input
                      className="nb-input h-10"
                      placeholder="Write a comment…"
                      value={newComment[p.id] || ""}
                      onChange={(e) => setNewComment({ ...newComment, [p.id]: e.target.value })}
                      data-testid={`comment-input-${p.id}`}
                    />
                    <button onClick={() => submitComment(p)} className="nb-btn bg-black text-white" data-testid={`submit-comment-${p.id}`}>
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
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-4" onClick={() => setShowNew(false)}>
          <form onSubmit={submitPost} onClick={(e) => e.stopPropagation()} className="nb-card p-6 w-full max-w-md bg-white space-y-4" data-testid="new-post-modal">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black">Share something</h2>
              <button type="button" onClick={() => setShowNew(false)}><X size={22} weight="bold" /></button>
            </div>
            <textarea required rows={4} className="nb-textarea" value={content} onChange={(e) => setContent(e.target.value)} placeholder="What's happening?" data-testid="post-content-input" />
            <button disabled={busy} className="nb-btn w-full h-12 text-white" style={{ backgroundColor: ACCENTS.community }} data-testid="post-submit-button">
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
    api.get("/community/channels").then(({ data }) => {
      setChannels(data);
      if (data[0]) setActive(data[0]);
    }).catch(() => {});
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
      <div className="nb-card p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <p className="overline">CHANNELS</p>
          <button onClick={() => setShowCreate(true)} data-testid="new-channel-button" className="text-xs font-bold underline">+ New</button>
        </div>
        <div className="space-y-1">
          {channels.map((c) => (
            <button
              key={c.id}
              onClick={() => setActive(c)}
              data-testid={`channel-${c.id}`}
              className={`w-full text-left px-3 py-2 rounded-lg border-2 border-black flex items-center gap-2 font-bold text-sm ${active?.id === c.id ? "text-white" : "bg-white"}`}
              style={active?.id === c.id ? { backgroundColor: ACCENTS.community } : {}}
            >
              <Hash size={14} weight="bold" /> {c.name}
            </button>
          ))}
        </div>
        {showCreate && (
          <form onSubmit={createChannel} className="mt-3 flex gap-1">
            <input className="nb-input h-9 text-xs" placeholder="channel name" value={newName} onChange={(e) => setNewName(e.target.value)} data-testid="new-channel-input" />
            <button className="nb-btn bg-black text-white text-xs px-2" data-testid="confirm-channel-button">Go</button>
          </form>
        )}
      </div>
      <div className="nb-card p-4 flex flex-col">
        <div className="border-b-2 border-black pb-2 mb-3">
          <p className="font-black text-lg flex items-center gap-1"><Hash size={18} weight="bold" />{active?.name || "select a channel"}</p>
          <p className="text-xs text-neutral-500">{active?.description}</p>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2" data-testid="messages-list">
          {messages.map((m) => (
            <div key={m.id} className={`text-sm ${m.author_id === user?.id ? "text-right" : ""}`}>
              <span className="font-bold">{m.author_name}: </span>{m.content}
            </div>
          ))}
          {messages.length === 0 && active && <p className="text-xs text-neutral-500">No messages — start the conversation!</p>}
        </div>
        {active && (
          <form onSubmit={send} className="mt-3 flex gap-2">
            <input className="nb-input h-11" placeholder={`Message #${active.name}`} value={text} onChange={(e) => setText(e.target.value)} data-testid="channel-message-input" />
            <button className="nb-btn bg-black text-white" data-testid="send-message-button">
              <PaperPlaneTilt size={16} weight="bold" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
