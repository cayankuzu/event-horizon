import React from 'react';

interface IconProps {
  size?: number;
}

const base = (size: number): React.SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.65,
  strokeLinecap: 'square',
  strokeLinejoin: 'miter',
});

export const IconShuttle: React.FC<IconProps> = ({ size = 14 }) => (
  <svg {...base(size)}>
    <path d="M12 2L15 9L21 15L15 15L14 21L12 19L10 21L9 15L3 15L9 9L12 2Z" />
  </svg>
);

export const IconCockpit: React.FC<IconProps> = ({ size = 14 }) => (
  <svg {...base(size)}>
    <rect x="2" y="4" width="20" height="16" />
    <path d="M2 15L7 12H17L22 15" />
    <circle cx="12" cy="9" r="1.5" />
  </svg>
);

export const IconGrid: React.FC<IconProps> = ({ size = 14 }) => (
  <svg {...base(size)}>
    <path d="M3 5H21M3 10C7 10 9 14 12 19C15 14 17 10 21 10M3 15H8M16 15H21" />
    <path d="M7 5V16M17 5V16M12 5V19" />
  </svg>
);

export const IconPlunge: React.FC<IconProps> = ({ size = 14 }) => (
  <svg {...base(size)}>
    <path d="M12 3V19" />
    <path d="M6 13L12 19L18 13" />
    <path d="M4 21H20" />
  </svg>
);

export const IconBook: React.FC<IconProps> = ({ size = 14 }) => (
  <svg {...base(size)}>
    <path d="M4 4H11C12 4 12 5 12 6V20C12 19 11 18 10 18H4V4Z" />
    <path d="M20 4H13C12 4 12 5 12 6V20C12 19 13 18 14 18H20V4Z" />
  </svg>
);

export const IconReset: React.FC<IconProps> = ({ size = 14 }) => (
  <svg {...base(size)}>
    <path d="M3 12A9 9 0 1 0 6 5.3L3 8" />
    <path d="M3 3V8H8" />
  </svg>
);

export const IconAudioOn: React.FC<IconProps> = ({ size = 14 }) => (
  <svg {...base(size)}>
    <path d="M11 5L6 9H2V15H6L11 19V5Z" />
    <path d="M15.5 8.5A5 5 0 0 1 15.5 15.5" />
    <path d="M18.8 5.2A9.5 9.5 0 0 1 18.8 18.8" />
  </svg>
);

export const IconAudioOff: React.FC<IconProps> = ({ size = 14 }) => (
  <svg {...base(size)}>
    <path d="M11 5L6 9H2V15H6L11 19V5Z" />
    <path d="M22 9L16 15M16 9L22 15" />
  </svg>
);

export const IconEye: React.FC<IconProps> = ({ size = 14 }) => (
  <svg {...base(size)}>
    <path d="M2 12C5 6.5 8.5 5 12 5C15.5 5 19 6.5 22 12C19 17.5 15.5 19 12 19C8.5 19 5 17.5 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const IconClose: React.FC<IconProps> = ({ size = 14 }) => (
  <svg {...base(size)}>
    <path d="M5 5L19 19M19 5L5 19" />
  </svg>
);

export const IconChevron: React.FC<IconProps> = ({ size = 13 }) => (
  <svg {...base(size)}>
    <path d="M6 9L12 15L18 9" />
  </svg>
);

export const IconWarning: React.FC<IconProps> = ({ size = 14 }) => (
  <svg {...base(size)}>
    <path d="M12 3L22 20H2L12 3Z" />
    <path d="M12 10V14" />
    <circle cx="12" cy="17" r="0.6" fill="currentColor" />
  </svg>
);
