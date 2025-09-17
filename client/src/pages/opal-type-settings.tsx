import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface OpalTypeSettings {
  opalTypes: string[];
}

export default function OpalTypeSettings() {
  const [newOpalType, setNewOpalType] = useState("");
  const queryClient = useQueryClient();

  // Fetch current opal types
  const { data: settings, isLoading } = useQuery<OpalTypeSettings>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings");
      if (!response.ok) throw new Error("Failed to fetch settings");
      return response.json();
    },
  });

  // Update opal types mutation
  const updateOpalTypesMutation = useMutation({
    mutationFn: async (opalTypes: string[]) => {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ opalTypes }),
      });
      if (!response.ok) throw new Error("Failed to update opal types");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Success",
        description: "Opal types updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddOpalType = () => {
    if (!newOpalType.trim()) return;
    
    const currentTypes = settings?.opalTypes || [];
    if (currentTypes.includes(newOpalType.trim())) {
      toast({
        title: "Duplicate",
        description: "This opal type already exists",
        variant: "destructive",
      });
      return;
    }

    const updatedTypes = [...currentTypes, newOpalType.trim()];
    updateOpalTypesMutation.mutate(updatedTypes);
    setNewOpalType("");
  };

  const handleRemoveOpalType = (typeToRemove: string) => {
    const currentTypes = settings?.opalTypes || [];
    const updatedTypes = currentTypes.filter(type => type !== typeToRemove);
    updateOpalTypesMutation.mutate(updatedTypes);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddOpalType();
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Opal Type Settings</h2>
        <p className="text-muted-foreground mt-2">
          Manage the opal types available throughout the application. These will be used in dropdowns for adding auctions and filtering.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Available Opal Types</CardTitle>
          <CardDescription>
            Add, remove, or modify opal types that appear in dropdowns across the application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new opal type */}
          <div className="flex gap-2">
            <div className="w-80">
              <Label htmlFor="new-opal-type">Add New Opal Type</Label>
              <Input
                id="new-opal-type"
                value={newOpalType}
                onChange={(e) => setNewOpalType(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter opal type name..."
                className="mt-1"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleAddOpalType}
                disabled={!newOpalType.trim() || updateOpalTypesMutation.isPending}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add
              </Button>
            </div>
          </div>

          {/* Current opal types */}
          <div>
            <Label className="text-sm font-medium">Current Opal Types ({settings?.opalTypes?.length || 0})</Label>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {(settings?.opalTypes || []).map((type) => (
                <div
                  key={type}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <span className="text-sm font-medium">{type}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveOpalType(type)}
                    disabled={updateOpalTypesMutation.isPending}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {(!settings?.opalTypes || settings.opalTypes.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No opal types configured yet.</p>
              <p className="text-sm mt-1">Add your first opal type above.</p>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
