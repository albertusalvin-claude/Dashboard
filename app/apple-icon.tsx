import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <svg
        width={180}
        height={180}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="24" height="24" fill="#EAEDE1" />
        <rect x="2.5" y="4" width="14" height="10.5" rx="2" stroke="#1B3327" strokeWidth="1.8" />
        <polyline
          points="4,10 6.2,10 7.6,6.7 9.2,12.3 10.6,8.8 12,10 13.6,10"
          fill="none"
          stroke="#1B3327"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <line x1="9.5" y1="14.5" x2="9.5" y2="17" stroke="#1B3327" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="6.5" y1="18.3" x2="12.5" y2="18.3" stroke="#1B3327" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="18.3" cy="14.8" r="3" fill="#EAEDE1" stroke="#1B3327" strokeWidth="2" />
        <line x1="20.42" y1="16.92" x2="21.6" y2="18.1" stroke="#1B3327" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
    { ...size }
  );
}
