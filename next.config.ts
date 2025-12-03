import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Configuration pour les tests sur mobile/réseau local
  experimental: {
    serverActions: {
      allowedOrigins: ['*'], // Permet l'accès depuis d'autres appareils
      bodySizeLimit: '10mb', // ← AUGMENTER LA LIMITE À 10 MB
    }
  },
  
  // Headers pour permettre l'accès depuis mobile
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
        ],
      },
    ]
  },
};

export default nextConfig;