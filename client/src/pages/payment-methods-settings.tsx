import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trash2, Plus, Edit, CreditCard } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PaymentMethod {
  id: string;
  name: string;
  description?: string;
}

export default function PaymentMethodsSettings() {
  const [newPaymentMethod, setNewPaymentMethod] = useState({ name: "", description: "" });
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<PaymentMethod | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  // Fetch current payment methods
  const { data: paymentMethods = [], isLoading } = useQuery<PaymentMethod[]>({
    queryKey: ["/api/settings/payment-methods"],
    queryFn: async () => {
      const response = await fetch("/api/settings/payment-methods");
      if (!response.ok) throw new Error("Failed to fetch payment methods");
      return response.json();
    },
  });

  // Add payment method mutation
  const addPaymentMethodMutation = useMutation({
    mutationFn: async (paymentMethod: { name: string; description?: string }) => {
      const response = await fetch("/api/settings/payment-methods", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentMethod),
      });
      if (!response.ok) throw new Error("Failed to add payment method");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/payment-methods"] });
      toast({
        title: "Success",
        description: "Payment method added successfully",
      });
      setIsAddDialogOpen(false);
      setNewPaymentMethod({ name: "", description: "" });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update payment method mutation
  const updatePaymentMethodMutation = useMutation({
    mutationFn: async ({ id, paymentMethod }: { id: string; paymentMethod: { name: string; description?: string } }) => {
      const response = await fetch(`/api/settings/payment-methods/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentMethod),
      });
      if (!response.ok) throw new Error("Failed to update payment method");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/payment-methods"] });
      toast({
        title: "Success",
        description: "Payment method updated successfully",
      });
      setIsEditDialogOpen(false);
      setEditingPaymentMethod(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete payment method mutation
  const deletePaymentMethodMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/settings/payment-methods/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete payment method");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/payment-methods"] });
      toast({
        title: "Success",
        description: "Payment method deleted successfully",
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

  const handleAddPaymentMethod = () => {
    if (!newPaymentMethod.name.trim()) return;
    
    const existingMethod = paymentMethods.find(method => 
      method.name.toLowerCase() === newPaymentMethod.name.toLowerCase()
    );
    
    if (existingMethod) {
      toast({
        title: "Duplicate",
        description: "This payment method already exists",
        variant: "destructive",
      });
      return;
    }

    addPaymentMethodMutation.mutate(newPaymentMethod);
  };

  const handleEditPaymentMethod = (paymentMethod: PaymentMethod) => {
    setEditingPaymentMethod(paymentMethod);
    setIsEditDialogOpen(true);
  };

  const handleUpdatePaymentMethod = () => {
    if (!editingPaymentMethod) return;
    
    const existingMethod = paymentMethods.find(method => 
      method.id !== editingPaymentMethod.id && 
      method.name.toLowerCase() === editingPaymentMethod.name.toLowerCase()
    );
    
    if (existingMethod) {
      toast({
        title: "Duplicate",
        description: "This payment method name already exists",
        variant: "destructive",
      });
      return;
    }

    updatePaymentMethodMutation.mutate({
      id: editingPaymentMethod.id,
      paymentMethod: {
        name: editingPaymentMethod.name,
        description: editingPaymentMethod.description
      }
    });
  };

  const handleDeletePaymentMethod = (id: string) => {
    if (window.confirm("Are you sure you want to delete this payment method?")) {
      deletePaymentMethodMutation.mutate(id);
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
        <h2 className="text-2xl font-semibold text-foreground">Payment Methods Settings</h2>
        <p className="text-muted-foreground mt-2">
          Manage the payment methods available throughout the application. These will be used in forms for adding auctions and live auctions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Available Payment Methods
          </CardTitle>
          <CardDescription>
            Add, edit, or remove payment methods that appear in forms across the application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new payment method button */}
          <div className="flex justify-end">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Payment Method
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Payment Method</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="payment-name">Payment Method Name *</Label>
                    <Input
                      id="payment-name"
                      value={newPaymentMethod.name}
                      onChange={(e) => setNewPaymentMethod(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Bank Transfer, PayPal, Credit Card"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="payment-description">Description</Label>
                    <Textarea
                      id="payment-description"
                      value={newPaymentMethod.description}
                      onChange={(e) => setNewPaymentMethod(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Optional description or instructions..."
                      rows={3}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleAddPaymentMethod}
                      disabled={!newPaymentMethod.name.trim() || addPaymentMethodMutation.isPending}
                    >
                      {addPaymentMethodMutation.isPending ? "Adding..." : "Add Payment Method"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Current payment methods */}
          <div>
            <Label className="text-sm font-medium">Current Payment Methods ({paymentMethods.length})</Label>
            <div className="mt-2 space-y-2">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between p-4 bg-muted rounded-lg border"
                >
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{method.name}</div>
                    {method.description && (
                      <div className="text-sm text-muted-foreground mt-1">{method.description}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditPaymentMethod(method)}
                      disabled={updatePaymentMethodMutation.isPending}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeletePaymentMethod(method.id)}
                      disabled={deletePaymentMethodMutation.isPending}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {paymentMethods.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p>No payment methods configured yet.</p>
              <p className="text-sm mt-1">Add your first payment method above.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Payment Method Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Payment Method</DialogTitle>
          </DialogHeader>
          {editingPaymentMethod && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-payment-name">Payment Method Name *</Label>
                <Input
                  id="edit-payment-name"
                  value={editingPaymentMethod.name}
                  onChange={(e) => setEditingPaymentMethod(prev => 
                    prev ? { ...prev, name: e.target.value } : null
                  )}
                  placeholder="e.g., Bank Transfer, PayPal, Credit Card"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="edit-payment-description">Description</Label>
                <Textarea
                  id="edit-payment-description"
                  value={editingPaymentMethod.description || ""}
                  onChange={(e) => setEditingPaymentMethod(prev => 
                    prev ? { ...prev, description: e.target.value } : null
                  )}
                  placeholder="Optional description or instructions..."
                  rows={3}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdatePaymentMethod}
                  disabled={!editingPaymentMethod.name.trim() || updatePaymentMethodMutation.isPending}
                >
                  {updatePaymentMethodMutation.isPending ? "Updating..." : "Update Payment Method"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
