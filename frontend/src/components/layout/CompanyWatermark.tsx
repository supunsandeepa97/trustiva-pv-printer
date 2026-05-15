'use client';
import { useEffect, useState } from 'react';
import { CompanyAPI } from '@/lib/api';

export default function CompanyWatermark() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    CompanyAPI.get()
      .then(res => {
        const url = res.data?.data?.logo_url;
        if (url) setLogoUrl(url);
      })
      .catch(() => {});
  }, []);

  if (!logoUrl) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-6 left-6 z-10 select-none"
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl}
        alt=""
        style={{
          width: 72,
          height: 72,
          objectFit: 'contain',
          opacity: 0.12,
          filter: 'grayscale(30%)',
        }}
      />
    </div>
  );
}
