import "@testing-library/jest-dom";
import { vi } from "vitest";

// In-memory cookie store for Route Handler testing under Vitest
const cookieStore = new Map<string, { name: string; value: string; options?: unknown }>();

vi.mock("next/headers", () => {
  return {
    cookies: async () => ({
      get: (name: string) => cookieStore.get(name),
      set: (name: string, value: string, options?: unknown) => {
        cookieStore.set(name, { name, value, options });
      },
      delete: (name: string) => {
        cookieStore.delete(name);
      },
      getAll: () => Array.from(cookieStore.values()),
      has: (name: string) => cookieStore.has(name),
    }),
    headers: async () => new Headers(),
  };
});
