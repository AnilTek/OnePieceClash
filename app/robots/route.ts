import { NextResponse } from 'next/server';

export async function GET() {
  const robotsTxt = `User-agent: *
Disallow: /

# Tüm arama motorlarını engelle
User-agent: Googlebot
Disallow: /

User-agent: Bingbot
Disallow: /

User-agent: Slurp
Disallow: /

User-agent: DuckDuckBot
Disallow: /

User-agent: Baiduspider
Disallow: /

User-agent: YandexBot
Disallow: /

User-agent: Sogou
Disallow: /

User-agent: Exabot
Disallow: /

User-agent: facebot
Disallow: /

User-agent: ia_archiver
Disallow: /
`;

  return new NextResponse(robotsTxt, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}

