import { useQuery } from "@tanstack/react-query";

interface OpalTypeSettings {
  opalTypes: string[];
}

export function useOpalTypes() {
  return useQuery<OpalTypeSettings>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings");
      if (!response.ok) throw new Error("Failed to fetch settings");
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}


