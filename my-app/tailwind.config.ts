/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // 启用基于 class 的深色模式
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}', // 确保覆盖你的组件路径
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};