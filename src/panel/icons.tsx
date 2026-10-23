import type { ComponentChildren, JSX } from "preact";

function Svg({
  children,
  ...rest
}: { children: ComponentChildren } & JSX.SVGAttributes<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      stroke-width="1.4"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

type IconProps = JSX.SVGAttributes<SVGSVGElement>;

export const RefreshIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13 8a5 5 0 1 1-1.6-3.7" />
    <path d="M13 2.5v3h-3" />
  </Svg>
);

export const PlusIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 3v10M3 8h10" />
  </Svg>
);

export const TrashIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 8.5h5.8l.6-8.5M7 7v4M9 7v4" />
  </Svg>
);

export const ClearIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="5.5" />
    <path d="M4.1 4.1l7.8 7.8" />
  </Svg>
);

export const SearchIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="7" cy="7" r="4" />
    <path d="M10 10l3.5 3.5" />
  </Svg>
);

export const CloseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 4l8 8M12 4l-8 8" />
  </Svg>
);

export const CopyIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="5.5" y="5.5" width="7.5" height="8" rx="1" />
    <path d="M10.5 3.5v-.5a1 1 0 0 0-1-1h-5.5a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h.5" />
  </Svg>
);

export const CheckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 8.5l3.2 3.2L13 5" />
  </Svg>
);

export const ArrowIcon = ({ down, ...p }: IconProps & { down?: boolean }) => (
  <Svg width="10" height="10" {...p}>
    <path d={down ? "M3 6l5 5 5-5" : "M3 10l5-5 5 5"} />
  </Svg>
);

export const LockIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="7" width="9" height="6.5" rx="1" />
    <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
  </Svg>
);

export const GithubIcon = (p: IconProps) => (
  <Svg fill="currentColor" stroke="none" {...p}>
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
  </Svg>
);

export const CookieIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M13.5 8.2A5.5 5.5 0 1 1 7.8 2.5a2.2 2.2 0 0 0 2.4 2.6 2 2 0 0 0 3.3 3.1z" />
    <circle cx="6" cy="6.5" r=".6" fill="currentColor" />
    <circle cx="9" cy="10" r=".6" fill="currentColor" />
    <circle cx="5.5" cy="10" r=".6" fill="currentColor" />
  </Svg>
);
