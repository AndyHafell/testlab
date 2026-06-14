import React, { useEffect, useState } from "react";
import { api } from "../api";
import type { Draft, DraftContent } from "../../domain/types";

export function Queue(): React.JSX.Element {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [busy, setBusy] = useState(false);

  async function refresh(): Promise<void> {
    setDrafts(await api.listQueue());
  }
  useEffect(() => {
    void refresh();
  }, []);

  async function onApprove(id: string, content: DraftContent): Promise<void> {
    setBusy(true);
    await api.approve(id, content);
    await refresh();
    setBusy(false);
  }
  async function onReject(id: string): Promise<void> {
    await api.reject(id);
    await refresh();
  }
  async function onRegenerate(id: string, feedback: string): Promise<void> {
    setBusy(true);
    await api.regenerate(id, feedback);
    await refresh();
    setBusy(false);
  }
  async function onGenerateNow(): Promise<void> {
    setBusy(true);
    await api.generateNow();
    await refresh();
    setBusy(false);
  }

  return (
    <div className="screen">
      <div className="toolbar">
        <button onClick={onGenerateNow} disabled={busy}>Generate now</button>
      </div>
      {drafts.length === 0 && <p className="muted">No pending drafts.</p>}
      {drafts.map((d) => (
        <DraftCard key={d.id} draft={d} busy={busy} onApprove={onApprove} onReject={onReject} onRegenerate={onRegenerate} />
      ))}
    </div>
  );
}

function DraftCard(props: {
  draft: Draft;
  busy: boolean;
  onApprove: (id: string, c: DraftContent) => void;
  onReject: (id: string) => void;
  onRegenerate: (id: string, feedback: string) => void;
}): React.JSX.Element {
  const { draft } = props;
  const [content, setContent] = useState<DraftContent>(draft.content);
  const [feedback, setFeedback] = useState("");

  return (
    <div className="card">
      <div className="context">{draft.context}</div>
      <div className="why">why: {draft.why}</div>
      {draft.imagePath && <img className="shot" src={`spfile://${draft.imagePath}`} alt="screenshot" />}

      <label>X post</label>
      <textarea
        value={content.twitter[0] ?? ""}
        onChange={(e) => setContent({ ...content, twitter: [e.target.value] })}
      />
      <span className="muted">{(content.twitter[0] ?? "").length} chars</span>

      <label>LinkedIn</label>
      <textarea value={content.linkedin} onChange={(e) => setContent({ ...content, linkedin: e.target.value })} />
      <span className="muted">{content.linkedin.length} chars</span>

      <label>Threads</label>
      <textarea value={content.threads} onChange={(e) => setContent({ ...content, threads: e.target.value })} />
      <span className="muted">{content.threads.length} chars</span>

      <div className="row">
        <input placeholder="feedback for rewrite" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
        <button disabled={props.busy} onClick={() => props.onRegenerate(draft.id, feedback)}>Regenerate</button>
      </div>

      <div className="row">
        <button className="primary" disabled={props.busy} onClick={() => props.onApprove(draft.id, content)}>Approve &amp; post</button>
        <button className="danger" disabled={props.busy} onClick={() => props.onReject(draft.id)}>Reject</button>
      </div>
    </div>
  );
}
