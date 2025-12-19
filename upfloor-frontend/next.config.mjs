/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // Fix for RainbowKit and wallet dependencies
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    }

    // Ignore React Native dependencies in web builds
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
    }

    // Handle missing modules gracefully
    config.externals = config.externals || []
    config.externals.push({
      '@react-native-async-storage/async-storage': 'commonjs @react-native-async-storage/async-storage',
    })

    // Comprehensive browser API fallbacks for SSR
    if (isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        indexedDB: false,
        path: false,
        os: false,
        stream: false,
        util: false,
        events: false,
        buffer: false,
      }
    }

    return config
  },
}

export default nextConfig
