import React, { useEffect, useState } from "react";
import { api } from "../api";
import type { SwipeEntry } from "../../domain/types";

const EMPTY = { date: "", tweet: "", platform: "x", likes: 0, comments: 0, retweets: 0, impressions: 0, note: "" };

function SwipeCard(props: { entry: SwipeEntry; onRemove: (id: string) => void; onRefresh: () => Promise<void> }): React.JSX.Element {
  const { entry } = props;
  const [note, setNote] = useState(entry.note);

  async function onSave(): Promise<void> {
    await api.updateSwipe(entry.id, { note });
    await props.onRefresh();
  }

  return (
    <div className="card">
      <div>{entry.tweet}</div>
      <div className="muted">⭐ {entry.likes} likes · {entry.comments} comments · {entry.retweets} RTs</div>
      <div className="row">
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Edit note" />
        <button onClick={onSave}>Save</button>
      </div>
      <button className="danger" onClick={() => props.onRemove(entry.id)}>Remove</button>
    </div>
  );
}

export function Swipe(): React.JSX.Element {
  const [items, setItems] = useState<SwipeEntry[]>([]);
  const [form, setForm] = useState({ ...EMPTY });

  async function refresh(): Promise<void> {
    setItems(await api.listSwipe());
  }
  useEffect(() => {
    void refresh();
  }, []);

  async function onAdd(): Promise<void> {
    await api.addSwipe(form);
    setForm({ ...EMPTY });
    await refresh();
  }
  async function onRemove(id: string): Promise<void> {
    await api.removeSwipe(id);
    await refresh();
  }

  return (
    <div className="screen">
      <div className="card">
        <label>Add a winning post</label>
        <textarea placeholder="tweet text" value={form.tweet} onChange={(e) => setForm({ ...form, tweet: e.target.value })} />
        <div className="row">
          <input type="number" placeholder="likes" value={form.likes} onChange={(e) => setForm({ ...form, likes: Number(e.target.value) })} />
          <input type="number" placeholder="comments" value={form.comments} onChange={(e) => setForm({ ...form, comments: Number(e.target.value) })} />
          <input type="number" placeholder="retweets" value={form.retweets} onChange={(e) => setForm({ ...form, retweets: Number(e.target.value) })} />
        </div>
        <input placeholder="why it worked" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        <button className="primary" onClick={onAdd}>Add</button>
      </div>

      {items.map((s) => (
        <SwipeCard key={s.id} entry={s} onRemove={onRemove} onRefresh={refresh} />
      ))}
    </div>
  );
}
