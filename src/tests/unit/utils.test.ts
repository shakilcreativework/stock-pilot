import { describe, it, expect } from "vitest";
import { cn, formatCurrency } from "@/lib/utils";

describe("Utility functions", () => {
  describe("cn", () => {
    it("merges standard class names correctly", () => {
      const result = cn("text-sm", "font-bold");
      expect(result).toBe("text-sm font-bold");
    });

    it("resolves conflicting Tailwind class names according to precedence", () => {
      const result = cn("p-4", "p-8");
      expect(result).toBe("p-8");
    });

    it("handles conditional class values", () => {
      const isHidden = false;
      const isVisible = true;
      const result = cn("flex", isHidden && "hidden", isVisible && "opacity-100");
      expect(result).toBe("flex opacity-100");
    });
  });

  describe("formatCurrency", () => {
    it("formats minor currency units to USD standard format", () => {
      expect(formatCurrency(1999)).toBe("$19.99");
      expect(formatCurrency(0)).toBe("$0.00");
      expect(formatCurrency(150000)).toBe("$1,500.00");
    });
  });
});

