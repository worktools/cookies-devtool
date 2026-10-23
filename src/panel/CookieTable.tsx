import { useRef, useState } from "preact/hooks";
import type { JSX } from "preact";
import { cookieKey, cookieSize, sameSiteLabel, type Cookie } from "./cookies";
import { ArrowIcon } from "./icons";

export type ColumnId =
  | "name"
  | "value"
  | "domain"
  | "path"
  | "expires"
  | "size"
  | "httpOnly"
  | "secure"
  | "sameSite"
  | "partition";

interface Column {
  id: ColumnId;
  label: string;
  width: number;
  sortValue: (c: Cookie) => string | number;
  text: (c: Cookie) => string;
}

const bool = (v: boolean) => (v ? "\u2713" : "");

const COLUMNS: Column[] = [
  {
    id: "name",
    label: "Name",
    width: 160,
    sortValue: (c) => c.name,
    text: (c) => c.name,
  },
  {
    id: "value",
    label: "Value",
    width: 260,
    sortValue: (c) => c.value,
    text: (c) => c.value,
  },
  {
    id: "domain",
    label: "Domain",
    width: 150,
    sortValue: (c) => c.domain,
    text: (c) => c.domain,
  },
  {
    id: "path",
    label: "Path",
    width: 70,
    sortValue: (c) => c.path,
    text: (c) => c.path,
  },
  {
    id: "expires",
    label: "Expires / Max-Age",
    width: 170,
    sortValue: (c) =>
      c.session || c.expirationDate === undefined ? Infinity : c.expirationDate,
    text: (c) =>
      c.session || c.expirationDate === undefined
        ? "Session"
        : new Date(c.expirationDate * 1000).toISOString().replace(/\.\d+Z$/, "Z"),
  },
  {
    id: "size",
    label: "Size",
    width: 50,
    sortValue: cookieSize,
    text: (c) => String(cookieSize(c)),
  },
  {
    id: "httpOnly",
    label: "HttpOnly",
    width: 64,
    sortValue: (c) => +c.httpOnly,
    text: (c) => bool(c.httpOnly),
  },
  {
    id: "secure",
    label: "Secure",
    width: 56,
    sortValue: (c) => +c.secure,
    text: (c) => bool(c.secure),
  },
  {
    id: "sameSite",
    label: "SameSite",
    width: 70,
    sortValue: (c) => sameSiteLabel(c.sameSite),
    text: (c) => sameSiteLabel(c.sameSite),
  },
  {
    id: "partition",
    label: "Partition Key",
    width: 150,
    sortValue: (c) => c.partitionKey?.topLevelSite ?? "",
    text: (c) => c.partitionKey?.topLevelSite ?? "",
  },
];

export interface SortState {
  id: ColumnId;
  desc: boolean;
}

export function sortCookies(list: Cookie[], sort: SortState): Cookie[] {
  const col = COLUMNS.find((c) => c.id === sort.id)!;
  const dir = sort.desc ? -1 : 1;
  return [...list].sort((a, b) => {
    const x = col.sortValue(a);
    const y = col.sortValue(b);
    const r =
      typeof x === "number" && typeof y === "number"
        ? x === y
          ? 0
          : x < y
            ? -1
            : 1
        : String(x).localeCompare(String(y));
    return r * dir || a.name.localeCompare(b.name);
  });
}

interface Props {
  cookies: Cookie[];
  selectedKey: string | null;
  sort: SortState;
  onSort: (s: SortState) => void;
  onSelect: (key: string | null) => void;
  onDelete: (c: Cookie) => void;
  emptyMessage: string;
}

export function CookieTable({
  cookies,
  selectedKey,
  sort,
  onSort,
  onSelect,
  onDelete,
  emptyMessage,
}: Props) {
  const [widths, setWidths] = useState<Record<string, number>>(() =>
    Object.fromEntries(COLUMNS.map((c) => [c.id, c.width])),
  );
  const wrapRef = useRef<HTMLDivElement>(null);

  const startResize = (e: PointerEvent, id: ColumnId) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = widths[id];
    const move = (ev: PointerEvent) =>
      setWidths((w) => ({
        ...w,
        [id]: Math.max(32, startW + ev.clientX - startX),
      }));
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const onKeyDown = (e: JSX.TargetedKeyboardEvent<HTMLDivElement>) => {
    if (
      e.target instanceof HTMLElement &&
      /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)
    )
      return;
    const idx = cookies.findIndex((c) => cookieKey(c) === selectedKey);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.min(
        cookies.length - 1,
        Math.max(0, idx + (e.key === "ArrowDown" ? 1 : -1)),
      );
      if (cookies[next]) {
        onSelect(cookieKey(cookies[next]));
        wrapRef.current
          ?.querySelectorAll("tbody tr")
          [next]?.scrollIntoView({ block: "nearest" });
      }
    } else if ((e.key === "Delete" || e.key === "Backspace") && idx >= 0) {
      e.preventDefault();
      onDelete(cookies[idx]);
    }
  };

  const total = COLUMNS.reduce((n, c) => n + widths[c.id], 0);

  return (
    <div class="table-wrap" ref={wrapRef} tabIndex={0} onKeyDown={onKeyDown}>
      <table style={{ width: `max(100%, ${total}px)` }}>
        <colgroup>
          {COLUMNS.map((c) => (
            <col key={c.id} style={{ width: `${widths[c.id]}px` }} />
          ))}
          <col />
        </colgroup>
        <thead>
          <tr>
            {COLUMNS.map((c) => (
              <th
                key={c.id}
                onClick={() =>
                  onSort({
                    id: c.id,
                    desc: sort.id === c.id ? !sort.desc : false,
                  })
                }
              >
                <span class="th-label">{c.label}</span>
                {sort.id === c.id && <ArrowIcon down={sort.desc} />}
                <span
                  class="resizer"
                  onPointerDown={(e) => startResize(e, c.id)}
                  onClick={(e) => e.stopPropagation()}
                />
              </th>
            ))}
            <th class="filler" />
          </tr>
        </thead>
        <tbody>
          {cookies.map((c) => {
            const key = cookieKey(c);
            return (
              <tr
                key={key}
                class={key === selectedKey ? "selected" : ""}
                onMouseDown={() => onSelect(key)}
              >
                {COLUMNS.map((col) => (
                  <td key={col.id} title={col.text(c)}>
                    {col.text(c)}
                  </td>
                ))}
                <td class="filler" />
              </tr>
            );
          })}
        </tbody>
      </table>
      {cookies.length === 0 && <div class="empty">{emptyMessage}</div>}
    </div>
  );
}
