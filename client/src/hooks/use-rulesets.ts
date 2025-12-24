import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

export function useRulesets() {
  return useQuery({
    queryKey: [api.rulesets.list.path],
    queryFn: async () => {
      const res = await fetch(api.rulesets.list.path);
      if (!res.ok) throw new Error("Failed to fetch rulesets");
      return api.rulesets.list.responses[200].parse(await res.json());
    },
  });
}

export function useRuleset(id: number) {
  return useQuery({
    queryKey: [api.rulesets.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.rulesets.get.path, { id });
      const res = await fetch(url);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch ruleset");
      return api.rulesets.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useCreateRuleset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.rulesets.create.input>) => {
      const res = await fetch(api.rulesets.create.path, {
        method: api.rulesets.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        if (res.status === 400) {
           const error = api.rulesets.create.responses[400].parse(await res.json());
           throw new Error(error.message);
        }
        throw new Error("Failed to create ruleset");
      }
      return api.rulesets.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.rulesets.list.path] });
    },
  });
}
