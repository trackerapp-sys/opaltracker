import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Plus, Edit, Gem } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface OpalTypeSettings {
  opalTypes: string[];
}

export default function OpalTypeSettings() {
  const [newOpalType, setNewOpalType] = useState("");
  const [editingOpalType, setEditingOpalType] = useState<{ oldName: string; newName: string } | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
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
      setIsAddDialogOpen(false);
      setIsEditDialogOpen(false);
      setNewOpalType("");
      setEditingOpalType(null);
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
  };

  const handleEditOpalType = (opalType: string) => {
    setEditingOpalType({ oldName: opalType, newName: opalType });
    setIsEditDialogOpen(true);
  };

  const handleUpdateOpalType = () => {
    if (!editingOpalType) return;
    
    const currentTypes = settings?.opalTypes || [];
    const otherTypes = currentTypes.filter(type => type !== editingOpalType.oldName);
    
    if (otherTypes.includes(editingOpalType.newName.trim())) {
      toast({
        title: "Duplicate",
        description: "This opal type name already exists",
        variant: "destructive",
      });
      return;
    }

    const updatedTypes = [...otherTypes, editingOpalType.newName.trim()];
    updateOpalTypesMutation.mutate(updatedTypes);
  };

  const handleRemoveOpalType = (typeToRemove: string) => {
    if (window.confirm(`Are you sure you want to delete "${typeToRemove}"?`)) {
      const currentTypes = settings?.opalTypes || [];
      const updatedTypes = currentTypes.filter(type => type !== typeToRemove);
      updateOpalTypesMutation.mutate(updatedTypes);
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
          <CardTitle className="flex items-center gap-2">
            <Gem className="w-5 h-5" />
            Available Opal Types
          </CardTitle>
          <CardDescription>
            Add, edit, or remove opal types that appear in dropdowns across the application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new opal type button */}
          <div className="flex justify-end">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Opal Type
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Opal Type</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="opal-type-name">Opal Type Name *</Label>
                    <Input
                      id="opal-type-name"
                      value={newOpalType}
                      onChange={(e) => setNewOpalType(e.target.value)}
                      placeholder="e.g., Black Opal, Crystal Opal, Boulder Opal"
                      className="mt-1"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleAddOpalType}
                      disabled={!newOpalType.trim() || updateOpalTypesMutation.isPending}
                    >
                      {updateOpalTypesMutation.isPending ? "Adding..." : "Add Opal Type"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Current opal types */}
          <div>
            <Label className="text-sm font-medium">Current Opal Types ({settings?.opalTypes?.length || 0})</Label>
            <div className="mt-2 space-y-2">
              {(settings?.opalTypes || []).map((type) => (
                <div
                  key={type}
                  className="flex items-center justify-between p-4 bg-muted rounded-lg border"
                >
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{type}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditOpalType(type)}
                      disabled={updateOpalTypesMutation.isPending}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
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
                </div>
              ))}
            </div>
          </div>

          {(!settings?.opalTypes || settings.opalTypes.length === 0) && (
            <div className="text-center py-8 text-muted-foreground">
              <Gem className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p>No opal types configured yet.</p>
              <p className="text-sm mt-1">Add your first opal type above.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Opal Type Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Opal Type</DialogTitle>
          </DialogHeader>
          {editingOpalType && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-opal-type-name">Opal Type Name *</Label>
                <Input
                  id="edit-opal-type-name"
                  value={editingOpalType.newName}
                  onChange={(e) => setEditingOpalType(prev => 
                    prev ? { ...prev, newName: e.target.value } : null
                  )}
                  placeholder="e.g., Black Opal, Crystal Opal, Boulder Opal"
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateOpalType}
                  disabled={!editingOpalType.newName.trim() || updateOpalTypesMutation.isPending}
                >
                  {updateOpalTypesMutation.isPending ? "Updating..." : "Update Opal Type"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
