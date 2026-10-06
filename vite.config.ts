import basicSsl from "@vitejs/plugin-basic-ssl";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  base: process.env.VITE_BASE || "/",
  plugins: mode === "celular" ? [basicSsl()] : [],
  server: { host: true },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
}));
