//this file is in here to prevent a hydration error 
/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
      turbopack: false,  // Disable Turbopack
    },
  };
  
  module.exports = nextConfig;
  