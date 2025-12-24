import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";

export function useStrategy() {
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.strategy.calculate.input>) => {
      const res = await fetch(api.strategy.calculate.path, {
        method: api.strategy.calculate.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to calculate strategy");
      return api.strategy.calculate.responses[200].parse(await res.json());
    },
  });
}
