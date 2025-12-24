import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

export function useHands(sessionId: number) {
  return useQuery({
    queryKey: [api.hands.list.path, sessionId],
    queryFn: async () => {
      const url = buildUrl(api.hands.list.path, { sessionId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch hands");
      return api.hands.list.responses[200].parse(await res.json());
    },
    enabled: !!sessionId,
  });
}

export function useCreateHand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: z.infer<typeof api.hands.create.input>) => {
      const res = await fetch(api.hands.create.path, {
        method: api.hands.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to record hand");
      return api.hands.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.hands.list.path, variables.sessionId] });
      queryClient.invalidateQueries({ queryKey: [api.sessions.get.path, variables.sessionId] });
    },
  });
}
