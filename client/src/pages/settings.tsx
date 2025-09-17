import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Settings as SettingsIcon, Save, RefreshCw, Plus, Trash2, CreditCard, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface SettingsData {
  timezone: string;
  dateFormat: string;
  currency: string;
  notifications: boolean;
  refreshRate: number;
  bidMonitoringEnabled: boolean;
  bidCheckInterval: number; // in minutes
}

interface PaymentMethod {
  id: string;
  name: string;
  description?: string;
}

export default function Settings() {
  const [settings, setSettings] = useState<SettingsData>({
    timezone: "Australia/Sydney",
    dateFormat: "DD/MM/YYYY HH:MM",
    currency: "AUD",
    notifications: true,
    refreshRate: 5,
    bidMonitoringEnabled: true,
    bidCheckInterval: 3, // Default to 3 minutes
  });

  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [newPaymentMethod, setNewPaymentMethod] = useState("");
  
  // Dialog state
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [editingPaymentMethod, setEditingPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentMethodName, setPaymentMethodName] = useState("");
  const [paymentMethodDescription, setPaymentMethodDescription] = useState("");
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current settings
  const { data: currentSettings, isLoading } = useQuery<SettingsData>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings");
      if (!response.ok) throw new Error("Failed to fetch settings");
      return response.json();
    },
    onSuccess: (data) => {
      setSettings(data);
    },
  });

  // Fetch payment methods
  const { data: currentPaymentMethods, isLoading: isLoadingPaymentMethods } = useQuery<PaymentMethod[]>({
    queryKey: ["/api/settings/payment-methods"],
    queryFn: async () => {
      const response = await fetch("/api/settings/payment-methods");
      if (!response.ok) throw new Error("Failed to fetch payment methods");
      return response.json();
    },
  });

  // Update local state when data changes
  useEffect(() => {
    if (currentPaymentMethods) {
      setPaymentMethods(currentPaymentMethods);
    }
  }, [currentPaymentMethods]);

  // Save settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (settingsData: SettingsData) => {
      return apiRequest("POST", "/api/settings", settingsData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings Saved",
        description: "Your settings have been updated successfully",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save settings",
        variant: "destructive",
      });
    },
  });

  // Add payment method mutation
  const addPaymentMethodMutation = useMutation({
    mutationFn: async (paymentMethod: Omit<PaymentMethod, 'id'>) => {
      return apiRequest("POST", "/api/settings/payment-methods", paymentMethod);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/payment-methods"] });
      setNewPaymentMethod("");
      toast({
        title: "Payment Method Added",
        description: "Payment method has been added successfully",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add payment method",
        variant: "destructive",
      });
    },
  });

  // Update payment method mutation
  const updatePaymentMethodMutation = useMutation({
    mutationFn: async ({ id, paymentMethod }: { id: string; paymentMethod: Omit<PaymentMethod, 'id'> }) => {
      return apiRequest("PUT", `/api/settings/payment-methods/${id}`, paymentMethod);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/payment-methods"] });
      toast({
        title: "Payment Method Updated",
        description: "Payment method has been updated successfully",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update payment method",
        variant: "destructive",
      });
    },
  });

  // Delete payment method mutation
  const deletePaymentMethodMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/settings/payment-methods/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings/payment-methods"] });
      toast({
        title: "Payment Method Deleted",
        description: "Payment method has been deleted successfully",
      });
    },
    onError: (error: unknown) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete payment method",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    saveSettingsMutation.mutate(settings);
  };

  const handleReset = () => {
    if (currentSettings) {
      setSettings(currentSettings);
    }
  };

  const handleAddPaymentMethod = () => {
    if (newPaymentMethod.trim()) {
      addPaymentMethodMutation.mutate({
        name: newPaymentMethod.trim(),
        description: "",
      });
    }
  };

  const handleDeletePaymentMethod = (id: string) => {
    deletePaymentMethodMutation.mutate(id);
  };

  // Dialog handlers
  const openPaymentDialog = (method?: PaymentMethod) => {
    if (method) {
      setEditingPaymentMethod(method);
      setPaymentMethodName(method.name);
      setPaymentMethodDescription(method.description || "");
    } else {
      setEditingPaymentMethod(null);
      setPaymentMethodName("");
      setPaymentMethodDescription("");
    }
    setIsPaymentDialogOpen(true);
  };

  const closePaymentDialog = () => {
    // Don't close if mutations are pending
    if (addPaymentMethodMutation.isPending || updatePaymentMethodMutation.isPending) {
      return;
    }
    
    setIsPaymentDialogOpen(false);
    setEditingPaymentMethod(null);
    setPaymentMethodName("");
    setPaymentMethodDescription("");
  };

  const handleSavePaymentMethod = () => {
    if (!paymentMethodName.trim()) return;

    const paymentMethodData = {
      name: paymentMethodName.trim(),
      description: paymentMethodDescription.trim(),
    };

    if (editingPaymentMethod) {
      updatePaymentMethodMutation.mutate({
        id: editingPaymentMethod.id,
        paymentMethod: paymentMethodData,
      }, {
        onSuccess: () => {
          closePaymentDialog();
        },
        onError: () => {
          // Keep dialog open on error so user can retry
        }
      });
    } else {
      addPaymentMethodMutation.mutate(paymentMethodData, {
        onSuccess: () => {
          closePaymentDialog();
        },
        onError: () => {
          // Keep dialog open on error so user can retry
        }
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-muted-foreground">
          Configure your Opal Tracker preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5" />
              General Settings
            </CardTitle>
            <CardDescription>
              Configure your general application preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={settings.timezone} onValueChange={(value) => setSettings(prev => ({ ...prev, timezone: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Australia/Sydney">Australia/Sydney</SelectItem>
                    <SelectItem value="Australia/Melbourne">Australia/Melbourne</SelectItem>
                    <SelectItem value="Australia/Brisbane">Australia/Brisbane</SelectItem>
                    <SelectItem value="Australia/Perth">Australia/Perth</SelectItem>
                    <SelectItem value="Australia/Adelaide">Australia/Adelaide</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">America/New_York</SelectItem>
                    <SelectItem value="America/Los_Angeles">America/Los_Angeles</SelectItem>
                    <SelectItem value="Europe/London">Europe/London</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dateFormat">Date Format</Label>
                <Select value={settings.dateFormat} onValueChange={(value) => setSettings(prev => ({ ...prev, dateFormat: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select date format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DD/MM/YYYY HH:MM">DD/MM/YYYY HH:MM</SelectItem>
                    <SelectItem value="MM/DD/YYYY HH:MM">MM/DD/YYYY HH:MM</SelectItem>
                    <SelectItem value="YYYY-MM-DD HH:MM">YYYY-MM-DD HH:MM</SelectItem>
                    <SelectItem value="DD-MM-YYYY HH:MM">DD-MM-YYYY HH:MM</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select value={settings.currency} onValueChange={(value) => setSettings(prev => ({ ...prev, currency: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                    <SelectItem value="NZD">NZD - New Zealand Dollar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="refreshRate">Refresh Rate (seconds)</Label>
                <Select value={settings.refreshRate.toString()} onValueChange={(value) => setSettings(prev => ({ ...prev, refreshRate: parseInt(value) }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select refresh rate" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 seconds</SelectItem>
                    <SelectItem value="10">10 seconds</SelectItem>
                    <SelectItem value="30">30 seconds</SelectItem>
                    <SelectItem value="60">1 minute</SelectItem>
                    <SelectItem value="300">5 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bid Monitoring Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Bid Monitoring</CardTitle>
            <CardDescription>
              Configure automatic bid checking for your auctions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="bidMonitoring">Enable Bid Monitoring</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically check for new bids on your auctions
                </p>
              </div>
              <Switch
                id="bidMonitoring"
                checked={settings.bidMonitoringEnabled}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, bidMonitoringEnabled: checked }))}
              />
            </div>

            {settings.bidMonitoringEnabled && (
              <div>
                <Label htmlFor="bidCheckInterval">Check Interval</Label>
                <Select value={settings.bidCheckInterval.toString()} onValueChange={(value) => setSettings(prev => ({ ...prev, bidCheckInterval: parseInt(value) }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select check interval" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Every 1 minute</SelectItem>
                    <SelectItem value="2">Every 2 minutes</SelectItem>
                    <SelectItem value="3">Every 3 minutes</SelectItem>
                    <SelectItem value="5">Every 5 minutes</SelectItem>
                    <SelectItem value="10">Every 10 minutes</SelectItem>
                    <SelectItem value="15">Every 15 minutes</SelectItem>
                    <SelectItem value="30">Every 30 minutes</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1">
                  How often to check for new bids on active auctions
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
            <CardDescription>
              Configure how you receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notifications">Enable Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications for bid updates and auction events
                </p>
              </div>
              <Switch
                id="notifications"
                checked={settings.notifications}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, notifications: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Payment Methods
            </CardTitle>
            <CardDescription>
              Manage your preferred payment methods for auctions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add new payment method */}
            <div className="flex gap-2">
              <Button
                onClick={() => openPaymentDialog()}
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Payment Method
              </Button>
            </div>

            {/* Payment methods list */}
            <div className="space-y-2">
              {isLoadingPaymentMethods ? (
                <div className="flex items-center justify-center py-4">
                  <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : paymentMethods.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No payment methods added yet. Add your first payment method above.
                </p>
              ) : (
                paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-card"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{method.name}</p>
                      {method.description && (
                        <p className="text-sm text-muted-foreground">{method.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openPaymentDialog(method)}
                        disabled={updatePaymentMethodMutation.isPending}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePaymentMethod(method.id)}
                        disabled={deletePaymentMethodMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-3">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={saveSettingsMutation.isPending}
          >
            Reset to Default
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveSettingsMutation.isPending}
          >
            {saveSettingsMutation.isPending ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Payment Method Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={(open) => {
        if (!open) {
          closePaymentDialog();
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingPaymentMethod ? "Edit Payment Method" : "Add Payment Method"}
            </DialogTitle>
            <DialogDescription>
              {editingPaymentMethod 
                ? "Update the payment method details below." 
                : "Add a new payment method for your auctions."
              }
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="payment-name">Payment Method Name</Label>
              <Input
                id="payment-name"
                placeholder="e.g., PayPal, Bank Transfer, Credit Card"
                value={paymentMethodName}
                onChange={(e) => setPaymentMethodName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payment-description">Description (Optional)</Label>
              <Textarea
                id="payment-description"
                placeholder="e.g., PayPal account, Bank Transfer details, Credit Card ending in 1234"
                value={paymentMethodDescription}
                onChange={(e) => setPaymentMethodDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closePaymentDialog}>
              Cancel
            </Button>
            <Button 
              onClick={handleSavePaymentMethod}
              disabled={!paymentMethodName.trim() || addPaymentMethodMutation.isPending || updatePaymentMethodMutation.isPending}
            >
              {addPaymentMethodMutation.isPending || updatePaymentMethodMutation.isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  {editingPaymentMethod ? "Updating..." : "Adding..."}
                </>
              ) : (
                editingPaymentMethod ? "Update" : "Add"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}