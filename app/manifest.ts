import type { MetadataRoute } from 'next'

// Lets phones add Vine to the home screen and open it like an app. Next adds the `/vine-app` base
// path to the <link> for this file but not to the URLs inside it, so they spell it out.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/vine-app/',
    name: 'Vine',
    short_name: 'Vine',
    description: 'Learn with your Vine community',
    start_url: '/vine-app/',
    scope: '/vine-app/',
    display: 'standalone',
    // The page background (amber-50) and the leaf tile's green (green-700).
    background_color: '#fffbeb',
    theme_color: '#15803d',
    icons: [
      { src: '/vine-app/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/vine-app/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/vine-app/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
