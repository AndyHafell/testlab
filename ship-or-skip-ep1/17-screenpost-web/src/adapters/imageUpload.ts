import { readFile as fsReadFile } from "node:fs/promises";
import { basename } from "node:path";

export interface UploaderConfig {
  fetchFn?: typeof fetch;
  readFile?: (path: string) => Promise<Buffer>;
  endpoint?: string;
}

/** Returns an uploader that POSTs a file to a temp host and returns the public URL. */
export function makeUploader(cfg: UploaderConfig = {}): (localPath: string) => Promise<string> {
  const fetchFn = cfg.fetchFn ?? fetch;
  const readFile = cfg.readFile ?? ((p: string) => fsReadFile(p));
  const endpoint = cfg.endpoint ?? "https://0x0.st";

  return async (localPath: string): Promise<string> => {
    const bytes = await readFile(localPath);
    const form = new FormData();
    form.append("file", new Blob([bytes as unknown as ArrayBuffer], { type: "image/png" }), basename(localPath));
    const resp = await fetchFn(endpoint, { method: "POST", body: form });
    if (!resp.ok) throw new Error(`upload failed: HTTP ${resp.status}`);
    return (await resp.text()).trim();
  };
}
