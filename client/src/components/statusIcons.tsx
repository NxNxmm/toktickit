import React from 'react';

interface SvgProps {
  size: number;
  children: React.ReactNode;
}

const Svg: React.FC<SvgProps> = ({ size, children }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    aria-hidden="true"
    focusable="false"
    style={{
      display: 'inline-block',
      verticalAlign: '-0.125em',
      marginRight: '4px',
      flexShrink: 0,
    }}
  >
    {children}
  </svg>
);

export const StatusIcon: React.FC<{ status: string; size?: number }> = ({ status, size = 12 }) => {
  switch (status) {
    case 'NEW':
      return (
        <Svg size={size}>
          <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
        </Svg>
      );
    case 'OPEN':
      return (
        <Svg size={size}>
          <circle cx="8" cy="8" r="4.5" fill="currentColor" />
        </Svg>
      );
    case 'IN_PROGRESS':
      return (
        <Svg size={size}>
          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M8 4.5V8l2.6 1.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'WAITING_FOR_REQUESTER':
      return (
        <Svg size={size}>
          <path
            d="M4.5 2h7M4.5 14h7M5.5 2v2.2c0 1.4 2.5 2.6 2.5 3.8s-2.5 2.4-2.5 3.8V14M10.5 2v2.2c0 1.4-2.5 2.6-2.5 3.8s2.5 2.4 2.5 3.8V14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'RESOLVED':
      return (
        <Svg size={size}>
          <path
            d="M3.5 8.5l3 3 6-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'CLOSED':
      return (
        <Svg size={size}>
          <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M5.3 8.2l1.9 1.9 3.5-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'REOPENED':
      return (
        <Svg size={size}>
          <path
            d="M13 8a5 5 0 1 1-1.5-3.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path
            d="M13 2.5V5h-2.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'CANCELLED':
      return (
        <Svg size={size}>
          <path
            d="M4 4l8 8M12 4l-8 8"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </Svg>
      );
    default:
      return (
        <Svg size={size}>
          <circle cx="8" cy="8" r="4.5" fill="currentColor" />
        </Svg>
      );
  }
};

export default StatusIcon;
