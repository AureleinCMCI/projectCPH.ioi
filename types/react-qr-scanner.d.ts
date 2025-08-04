declare module 'react-qr-scanner' {
  import { Component } from 'react';

  interface QrScannerProps {
    delay?: number;
    onError?: (error: unknown) => void;
    onScan?: (data: { text: string } | null) => void;
    style?: React.CSSProperties;
    constraints?: {
      video?: {
        facingMode?: string;
        width?: { min?: number; ideal?: number; max?: number };
        height?: { min?: number; ideal?: number; max?: number };
      };
    };
  }

  export default class QrScanner extends Component<QrScannerProps> {}
} 