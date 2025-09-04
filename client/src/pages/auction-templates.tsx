import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Copy, Edit, Trash2, Gem } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  opalType: z.string().min(1, "Opal type is required"),
  origin: z.string().min(1, "Origin is required"),
  shape: z.string().min(1, "Shape is required"),
  description: z.string().min(1, "Description template is required"),
  defaultStartingBid: z.string().min(1, "Default starting bid is required"),
});

type TemplateForm = z.infer<typeof templateSchema>;

interface AuctionTemplate {
  id: string;
  name: string;
  opalType: string;
  origin: string;
  shape: string;
  description: string;
  defaultStartingBid: string;
  usageCount: number;
}

const predefinedTemplates: AuctionTemplate[] = [
  {
    id: "lightning-ridge-black",
    name: "Lightning Ridge Black Opal",
    opalType: "Black Opal",
    origin: "Lightning Ridge",
    shape: "Freeform",
    description: "Premium Lightning Ridge black opal with vibrant {colors} fire. Natural potch backing. Weight: {weight}ct",
    defaultStartingBid: "150",
    usageCount: 0,
  },
  {
    id: "crystal-opal-cabochon",
    name: "Crystal Opal Cabochon",
    opalType: "Crystal Opal",
    origin: "Lightning Ridge",
    shape: "Oval Cabochon",
    description: "Beautiful crystal opal with {colors} play of color. Perfect for jewelry setting. Weight: {weight}ct",
    defaultStartingBid: "25",
    usageCount: 0,
  },
  {
    id: "boulder-opal-rough",
    name: "Queensland Boulder Opal",
    opalType: "Boulder Opal",
    origin: "Queensland",
    shape: "Rough",
    description: "Natural boulder opal from Queensland with {colors} flashes. Ironstone matrix backing. Weight: {weight}ct",
    defaultStartingBid: "45",
    usageCount: 0,
  },
  {
    id: "white-opal-carved",
    name: "Carved White Opal",
    opalType: "White Opal",
    origin: "Coober Pedy",
    shape: "Carved",
    description: "Hand-carved white opal featuring {pattern} design with {colors} highlights. Weight: {weight}ct",
    defaultStartingBid: "35",
    usageCount: 0,
  },
  {
    id: "fire-opal-mexican",
    name: "Mexican Fire Opal",
    opalType: "Fire Opal",
    origin: "Mexico",
    shape: "Freeform",
    description: "Vibrant Mexican fire opal with intense {colors} body tone. Transparent to translucent. Weight: {weight}ct",
    defaultStartingBid: "40",
    usageCount: 0,
  },
];

export default function AuctionTemplates() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<AuctionTemplate[]>(predefinedTemplates);
  const [editingTemplate, setEditingTemplate] = useState<AuctionTemplate | null>(null);
  const [showForm, setShowForm] = useState(false);

  const form = useForm<TemplateForm>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      opalType: "",
      origin: "",
      shape: "",
      description: "",
      defaultStartingBid: "",
    },
  });

  const onSubmit = (data: TemplateForm) => {
    const newTemplate: AuctionTemplate = {
      id: Date.now().toString(),
      ...data,
      usageCount: 0,
    };

    if (editingTemplate) {
      setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? { ...newTemplate, id: editingTemplate.id, usageCount: editingTemplate.usageCount } : t));
      toast({ title: "Template updated successfully" });
    } else {
      setTemplates(prev => [...prev, newTemplate]);
      toast({ title: "Template created successfully" });
    }

    form.reset();
    setEditingTemplate(null);
    setShowForm(false);
  };

  const editTemplate = (template: AuctionTemplate) => {
    setEditingTemplate(template);
    form.reset({
      name: template.name,
      opalType: template.opalType,
      origin: template.origin,
      shape: template.shape,
      description: template.description,
      defaultStartingBid: template.defaultStartingBid,
    });
    setShowForm(true);
  };

  const duplicateTemplate = (template: AuctionTemplate) => {
    const duplicated: AuctionTemplate = {
      ...template,
      id: Date.now().toString(),
      name: `${template.name} (Copy)`,
      usageCount: 0,
    };
    setTemplates(prev => [...prev, duplicated]);
    toast({ title: "Template duplicated successfully" });
  };

  const deleteTemplate = (id: string) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
    toast({ title: "Template deleted successfully" });
  };

  const generateAuctionText = (template: AuctionTemplate, weight: string = "2.5", colors: string = "green and blue") => {
    return template.description
      .replace(/{weight}/g, weight)
      .replace(/{colors}/g, colors)
      .replace(/{pattern}/g, "floral");
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Auction Templates</h1>
          <p className="text-muted-foreground">Create and manage reusable auction templates for faster listing</p>
        </div>
        <Button 
          onClick={() => setShowForm(true)} 
          data-testid="button-new-template"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Template
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              {editingTemplate ? "Edit Template" : "Create New Template"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Template Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Lightning Ridge Black Opal" {...field} data-testid="input-template-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="opalType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Opal Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-opal-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Black Opal">Black Opal</SelectItem>
                            <SelectItem value="Crystal Opal">Crystal Opal</SelectItem>
                            <SelectItem value="White Opal">White Opal</SelectItem>
                            <SelectItem value="Boulder Opal">Boulder Opal</SelectItem>
                            <SelectItem value="Fire Opal">Fire Opal</SelectItem>
                            <SelectItem value="Matrix Opal">Matrix Opal</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="origin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Origin</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-origin">
                              <SelectValue placeholder="Select origin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Lightning Ridge">Lightning Ridge</SelectItem>
                            <SelectItem value="Queensland">Queensland</SelectItem>
                            <SelectItem value="Coober Pedy">Coober Pedy</SelectItem>
                            <SelectItem value="Mexico">Mexico</SelectItem>
                            <SelectItem value="Ethiopia">Ethiopia</SelectItem>
                            <SelectItem value="Virgin Valley">Virgin Valley</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="shape"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shape</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-shape">
                              <SelectValue placeholder="Select shape" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Freeform">Freeform</SelectItem>
                            <SelectItem value="Oval">Oval</SelectItem>
                            <SelectItem value="Round">Round</SelectItem>
                            <SelectItem value="Pear">Pear</SelectItem>
                            <SelectItem value="Rough">Rough</SelectItem>
                            <SelectItem value="Carved">Carved</SelectItem>
                            <SelectItem value="Cabochon">Cabochon</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description Template</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Use {weight} for weight, {colors} for colors, {pattern} for patterns..."
                          className="min-h-[100px]"
                          {...field}
                          data-testid="textarea-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="defaultStartingBid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Starting Bid</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-muted-foreground">$</span>
                          <Input 
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="pl-8"
                            {...field}
                            data-testid="input-starting-bid"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex space-x-4">
                  <Button type="submit" data-testid="button-save-template">
                    {editingTemplate ? "Update Template" : "Create Template"}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => { setShowForm(false); setEditingTemplate(null); form.reset(); }}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Gem className="w-5 h-5 mr-2 text-primary" />
                  <span className="text-sm">{template.name}</span>
                </div>
                <div className="flex space-x-1">
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => editTemplate(template)}
                    data-testid={`button-edit-${template.id}`}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => duplicateTemplate(template)}
                    data-testid={`button-duplicate-${template.id}`}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => deleteTemplate(template.id)}
                    disabled={predefinedTemplates.some(t => t.id === template.id)}
                    data-testid={`button-delete-${template.id}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium">{template.opalType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Origin:</span>
                  <span className="font-medium">{template.origin}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shape:</span>
                  <span className="font-medium">{template.shape}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Starting Bid:</span>
                  <span className="font-medium">${template.defaultStartingBid}</span>
                </div>
                <div className="mt-3 p-2 bg-muted rounded text-xs">
                  <strong>Preview:</strong>
                  <p className="mt-1">{generateAuctionText(template)}</p>
                </div>
                {template.usageCount > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Used {template.usageCount} times
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}