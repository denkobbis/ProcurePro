// Minimal hand-drawn stroke icon set (24x24, currentColor) — no external
// icon library dependency. Keep new icons consistent: stroke-width 1.75,
// round linecap/linejoin, no fill.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function DashboardIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function DocumentIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 3.5h8l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z" />
      <path d="M14 3.5V8h4" />
      <path d="M8.5 12.5h7M8.5 16h5" />
    </svg>
  );
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.3l2.4 2.4 4.6-5" />
    </svg>
  );
}

export function CartIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 4.5h2l1.6 10.2a1.5 1.5 0 0 0 1.48 1.3h7.44a1.5 1.5 0 0 0 1.47-1.2l1.3-6.3H6.2" />
      <circle cx="9.5" cy="19.5" r="1.4" />
      <circle cx="17" cy="19.5" r="1.4" />
    </svg>
  );
}

export function BuildingIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="4.5" y="3.5" width="12" height="17" rx="1" />
      <path d="M16.5 9.5h3a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1h-3" />
      <path d="M8 7.5h1.5M12 7.5h1.5M8 11h1.5M12 11h1.5M8 14.5h1.5M12 14.5h1.5" />
      <path d="M9 20.5V17h3v3.5" />
    </svg>
  );
}

export function TruckIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 6.5h10v9H3z" />
      <path d="M13 10h4l3 3v2.5h-7z" />
      <circle cx="7" cy="17.5" r="1.6" />
      <circle cx="16.5" cy="17.5" r="1.6" />
    </svg>
  );
}

export function ScaleIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5v17M8 20.5h8" />
      <path d="M5 7.5h5M14 7.5h5" />
      <path d="M5 7.5 2.5 12.8a2.7 2.7 0 0 0 5 0L5 7.5ZM19 7.5l-2.5 5.3a2.7 2.7 0 0 0 5 0L19 7.5Z" />
    </svg>
  );
}

export function WalletIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 7.5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2Z" />
      <path d="M3.5 10.5H17a2 2 0 0 1 2 2V14a2 2 0 0 1-2 2H3.5" />
      <circle cx="16.3" cy="13" r="1.1" />
    </svg>
  );
}

export function ChartBarIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 20.5V13M9.5 20.5V8M15 20.5v-6M20 20.5V5" />
      <path d="M3.5 20.5h17" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 20v-1.2A4.8 4.8 0 0 1 8.3 14h1.4a4.8 4.8 0 0 1 4.8 4.8V20" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M15.5 14.2A4.4 4.4 0 0 1 20.5 18.4V20" />
    </svg>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 10.5a6 6 0 0 1 12 0c0 3.2 1 4.6 1.6 5.3.3.4 0 1-.5 1H4.9c-.5 0-.8-.6-.5-1 .6-.7 1.6-2.1 1.6-5.3Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 6h17M3.5 12h17M3.5 18h17" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 4.5v15M4.5 12h15" />
    </svg>
  );
}

export function InboxIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 12.5h4.2l1.3 2.5h5l1.3-2.5H20" />
      <path d="M5.5 5.5h13l2 7v6a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-6Z" />
    </svg>
  );
}

export function ExternalLinkIcon(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M9 6H5.5a2 2 0 0 0-2 2V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3.5" />
      <path d="M13.5 4H20v6.5" />
      <path d="M10 14 20 4" />
    </svg>
  );
}

export function LogoMarkIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <rect width="24" height="24" rx="6" fill="currentColor" />
      <path d="M8 7h5.2a3.3 3.3 0 0 1 0 6.6H10v3.4H8V7Zm2 2v2.6h3.2a1.3 1.3 0 0 0 0-2.6H10Z" fill="white" />
    </svg>
  );
}
