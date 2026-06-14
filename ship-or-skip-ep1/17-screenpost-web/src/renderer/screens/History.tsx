import React, { useEffect, useState } from "react";
import { api } from "../api";
import type { Draft } from "../../domain/types";

export function History(): React.JSX.Element {
  const [items, setItems] = useState<Draft[]>([]);
  useEffect(() => {
    void api.listHistory().then(setItems);
  }, []);

  return (
    <div className="screen">
      {items.length === 0 && <p className="muted">No history yet.</p>}
      {items.map((d) => (
        <div className="card row" key={d.id}>
          <span className={`badge ${d.status}`}>{d.status}</span>
          <div>
            <div className="context">{d.context}</div>
            <div className="muted">{new Date(d.createdAt).toLocaleString()}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
