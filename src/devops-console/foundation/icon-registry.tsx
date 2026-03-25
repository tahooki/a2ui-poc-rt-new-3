import type { SVGProps } from "react";

const iconPaths = {
  robot:
    "M5 10V8a7 7 0 0 1 14 0v2h1a2 2 0 0 1 2 2v6a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4v-6a2 2 0 0 1 2-2h1Zm2 0h10V8a5 5 0 0 0-10 0v2Zm-1 2v6a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-6H6Zm3 2a1.25 1.25 0 1 1 0 2.5A1.25 1.25 0 0 1 9 14Zm6 0a1.25 1.25 0 1 1 0 2.5A1.25 1.25 0 0 1 15 14Z",
  deploy:
    "M5 19h14v2H5v-2Zm7-16 6 6h-4v6h-4V9H6l6-6Z",
  approve:
    "M4 5h16v14H4V5Zm2 2v10h12V7H6Zm2 5.5 2 2 5-5 1.5 1.5-6.5 6.5-3.5-3.5L8 12.5Z",
  rollback:
    "M12 5V2L7 6l5 4V7c3.31 0 6 2.69 6 6a6 6 0 0 1-10.24 4.24l-1.42 1.42A8 8 0 1 0 12 5Z",
  dashboard:
    "M4 4h7v7H4V4Zm9 0h7v4h-7V4ZM4 13h4v7H4v-7Zm6 0h10v7H10v-7Z",
  assistant:
    "M12 2 3 6v6c0 5 3.84 9.69 9 10 5.16-.31 9-5 9-10V6l-9-4Zm0 2.18L19 7.3V12c0 3.86-2.86 7.57-7 7.95C7.86 19.57 5 15.86 5 12V7.3l7-3.12Zm-1 4.82h2v4l3 2-1 1.73-4-2.48V9Z",
  search:
    "m15.5 14 4.5 4.5-1.5 1.5-4.5-4.5V14h-.79l-.28-.27A6.47 6.47 0 0 1 9 15.5 6.5 6.5 0 1 1 15.5 9c0 1.61-.59 3.09-1.57 4.23l.27.27h1.3ZM9 13.5A4.5 4.5 0 1 0 9 4.5a4.5 4.5 0 0 0 0 9Z",
  filter:
    "M4 5h16v2l-6 7v5l-4-2v-3L4 7V5Z",
  refresh:
    "M17.65 6.35A7.95 7.95 0 0 0 12 4V1L7 6l5 5V7a5 5 0 1 1-5 5H5a7 7 0 1 0 12.65-5.65Z",
  chevronRight:
    "m10 6 6 6-6 6-1.4-1.4 4.6-4.6-4.6-4.6L10 6Z",
  warning:
    "M1 21h22L12 2 1 21Zm12-3h-2v-2h2v2Zm0-4h-2v-4h2v4Z",
  checkCircle:
    "M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm-1 15-5-5 1.41-1.41L11 14.17l5.59-5.58L18 10l-7 7Z",
  history:
    "M13 3a9 9 0 1 0 8.95 10H19.9A7 7 0 1 1 13 5v3l4-4-4-4v3Zm-1 5h2v6h-5v-2h3V8Z",
  tune:
    "M3 17h6v2H3v-2Zm12 0h6v2h-6v-2ZM8 5h13v2H8V5ZM3 5h3v2H3V5Zm8 6h10v2H11v-2ZM3 11h5v2H3v-2Z",
  terminal:
    "M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 2v10h16V7H4Zm3 7-3-3 3-3 1.4 1.4L6.8 11l1.6 1.6L7 14Zm3 0h6v-2h-6v2Z",
} as const;

export type IconName = keyof typeof iconPaths;

type IconProps = SVGProps<SVGSVGElement> & {
  name: IconName;
  size?: number;
};

export function Icon({ name, size = 18, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      fill="currentColor"
      height={size}
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      <path d={iconPaths[name]} />
    </svg>
  );
}
