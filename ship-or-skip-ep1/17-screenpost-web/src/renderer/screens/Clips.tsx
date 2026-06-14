import React, { useEffect, useState } from "react";
import { api } from "../api";
import type { ClipItem } from "../../domain/types";

export function Clips(): React.JSX.Element {
  const [items, setItems] = useState<ClipItem[]>([]);
  const [page, setPage] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void api.listClips(page).then(setItems);
  }, [page]);

  async function onPost(id: string): Promise<void> {
    const draft = await api.postClip(id);
    setMessage(draft ? "Draft created — open the Queue tab." : "Nothing postable in that clip.");
  }

  return (
    <div className="screen">
      {message && <p className="muted">{message}</p>}
      <div className="grid">
        {items.map((c) => (
          <div className="cell" key={c.id}>
            {c.imagePath ? (
              <img className="thumb" src={`spfile://${c.imagePath}`} alt="clip" />
            ) : (
              <div className="cliptext">{c.textContent}</div>
            )}
            <div className="muted">{c.sourceApp || c.kind}</div>
            <button onClick={() => onPost(c.id)}>Post</button>
          </div>
        ))}
      </div>
      <div className="row">
        <button disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</button>
        <span>page {page + 1}</span>
        <button disabled={items.length === 0} onClick={() => setPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}
