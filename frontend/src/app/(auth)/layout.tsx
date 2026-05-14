import Image from 'next/image';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1a2d4a 50%, #0F172A 100%)' }}>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'linear-gradient(rgba(201,162,39,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(201,162,39,.6) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* Radial glow */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(201,162,39,0.08) 0%, transparent 70%)' }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo block */}
        <div className="text-center mb-8">
          <div className="inline-flex flex-col items-center gap-3">
            {/* Logo image */}
            <div className="w-20 h-20 flex items-center justify-center drop-shadow-2xl">
              <Image src="/assets/logo/logo.png" alt="Trustiva" width={80} height={80} className="object-contain" priority />
            </div>

            {/* Brand name */}
            <div>
              <div
                className="font-bold text-3xl tracking-widest"
                style={{
                  fontFamily: 'Montserrat, Inter, sans-serif',
                  background: 'linear-gradient(90deg, #C9A227 0%, #F0CE35 50%, #C9A227 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                TRUST<span style={{ fontWeight: 900 }}>IVA</span>
              </div>
              <div className="text-xs tracking-[0.3em] mt-0.5" style={{ color: 'rgba(201,162,39,0.55)' }}>
                PRINT SUITE
              </div>
            </div>

            {/* Gold divider */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-px" style={{ background: 'rgba(201,162,39,0.4)' }} />
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#C9A227' }} />
              <div className="w-8 h-px" style={{ background: 'rgba(201,162,39,0.4)' }} />
            </div>

            <p className="text-sm" style={{ color: 'rgba(201,162,39,0.5)' }}>
              Smart Financial Printing Platform
            </p>
          </div>
        </div>

        {children}
      </div>
    </main>
  );
}
