import { useMemo, useState } from "preact/hooks";
import {
  draftUrl,
  saveCookie,
  toDraft,
  type Cookie,
  type CookieDraft,
  type SameSite,
} from "./cookies";
import { CheckIcon, CloseIcon, CopyIcon, TrashIcon } from "./icons";

interface Props {
  /** Existing cookie being inspected; undefined when creating a new one. */
  cookie?: Cookie;
  /** Defaults used when creating a new cookie. */
  defaults: CookieDraft;
  onSaved: (c: Cookie) => void;
  onDelete?: (c: Cookie) => void;
  onClose: () => void;
}

const pad = (n: number) => String(n).padStart(2, "0");

function toLocalInput(sec: number): string {
  const d = new Date(sec * 1000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function CookieDetail({
  cookie,
  defaults,
  onSaved,
  onDelete,
  onClose,
}: Props) {
  const base = useMemo(
    () => (cookie ? toDraft(cookie) : defaults),
    [cookie, defaults],
  );
  const [edits, setEdits] = useState<Partial<CookieDraft>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const draft: CookieDraft = { ...base, ...edits };
  const dirty = Object.keys(edits).length > 0;
  const isNew = !cookie;
  const session = draft.expirationDate === undefined;

  const set = <K extends keyof CookieDraft>(k: K, v: CookieDraft[K]) =>
    setEdits((e) => ({ ...e, [k]: v }));

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const saved = await saveCookie(draft, cookie);
      setEdits({});
      onSaved(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const copyValue = async () => {
    await navigator.clipboard.writeText(draft.value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      if (dirty || isNew) save();
    }
  };

  return (
    <div class="detail" onKeyDown={onKeyDown}>
      <div class="detail-head">
        <span class="detail-title">
          {isNew ? "New cookie" : "Cookie Value"}
        </span>
        {!isNew && <span class="detail-sub">{draftUrl(draft)}</span>}
        <span class="spacer" />
        <button class="icon-btn" title="Copy value" onClick={copyValue}>
          {copied ? <CheckIcon /> : <CopyIcon />}
        </button>
        {cookie && onDelete && (
          <button
            class="icon-btn"
            title="Delete cookie"
            onClick={() => onDelete(cookie)}
          >
            <TrashIcon />
          </button>
        )}
        <button class="icon-btn" title="Close" onClick={onClose}>
          <CloseIcon />
        </button>
      </div>
      <div class="detail-body">
        <div class="form-grid">
          <label>Name</label>
          <input
            type="text"
            spellcheck={false}
            value={draft.name}
            onInput={(e) => set("name", e.currentTarget.value)}
          />
          <label>Domain</label>
          <input
            type="text"
            spellcheck={false}
            value={draft.domain}
            title="A leading dot makes the cookie apply to subdomains"
            onInput={(e) => set("domain", e.currentTarget.value.trim())}
          />
          <label>Path</label>
          <input
            type="text"
            spellcheck={false}
            value={draft.path}
            onInput={(e) => set("path", e.currentTarget.value.trim())}
          />
          <label>Expires</label>
          <div class="row">
            <label class="check">
              <input
                type="checkbox"
                checked={session}
                onChange={(e) =>
                  set(
                    "expirationDate",
                    e.currentTarget.checked
                      ? undefined
                      : Math.floor(Date.now() / 1000) + 7 * 86400,
                  )
                }
              />
              Session
            </label>
            <input
              type="datetime-local"
              step={1}
              disabled={session}
              value={session ? "" : toLocalInput(draft.expirationDate!)}
              onInput={(e) => {
                const t = new Date(e.currentTarget.value).getTime();
                if (!Number.isNaN(t))
                  set("expirationDate", Math.floor(t / 1000));
              }}
            />
          </div>
          <label>SameSite</label>
          <select
            value={draft.sameSite}
            onChange={(e) => set("sameSite", e.currentTarget.value as SameSite)}
          >
            <option value="unspecified">Unspecified</option>
            <option value="no_restriction">None</option>
            <option value="lax">Lax</option>
            <option value="strict">Strict</option>
          </select>
          <label>Flags</label>
          <div class="row">
            <label class="check">
              <input
                type="checkbox"
                checked={draft.secure}
                onChange={(e) => set("secure", e.currentTarget.checked)}
              />
              Secure
            </label>
            <label class="check">
              <input
                type="checkbox"
                checked={draft.httpOnly}
                onChange={(e) => set("httpOnly", e.currentTarget.checked)}
              />
              HttpOnly
            </label>
          </div>
        </div>
        <div class="value-col">
          <label>Value</label>
          <textarea
            spellcheck={false}
            value={draft.value}
            onInput={(e) => set("value", e.currentTarget.value)}
          />
        </div>
      </div>
      <div class="detail-foot">
        {error && <span class="error-text">{error}</span>}
        <span class="spacer" />
        {dirty && !isNew && (
          <button onClick={() => setEdits({})} disabled={busy}>
            Revert
          </button>
        )}
        <button
          class="primary"
          onClick={save}
          disabled={busy || (!dirty && !isNew)}
        >
          {isNew ? "Add" : "Save"}
        </button>
      </div>
    </div>
  );
}
