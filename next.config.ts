import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  /* config options here */
  async rewrites() {
    return {
      afterFiles: [
        {
          source: '/v1/:path*',
          destination: 'https://devtest.panglimapropertindo.id/:path*',
        },
      ],
      beforeFiles: [
        {
          source: '/v1/:path*',
          destination: 'https://devtest.panglimapropertindo.id/:path*',
        },
      ],
      fallback: [
        {
          source: '/v1/:path*',
          destination: 'https://devtest.panglimapropertindo.id/:path*',
        },
      ],
    }
    // return [
    //   {

    //     basePath: false,
    //   },
    // ]
  },
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
  async redirects() {
    return [
      // {
      //   source: '/',
      //   destination: '/',
      //   has: [
      //     {
      //       type: 'header',
      //       key: 'x-redirect-me',
      //     },
      //   ],
      //   permanent: false,
      // },
    ]
  },
  poweredByHeader: false,
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin',
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(self), microphone=(), geolocation=(), interest-cohort=()',
        },
      ],
    },
  ],
}

export default nextConfig
