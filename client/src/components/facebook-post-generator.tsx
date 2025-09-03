import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Copy, Facebook, ExternalLink } from "lucide-react";

interface FormData {
  opalType: string;
  weight: string;
  description?: string;
  origin?: string;
  shape?: string;
  facebookGroup: string;
  startingBid: string;
  endTime: string;
}

interface FacebookPostGeneratorProps {
  formData: FormData;
  trigger?: React.ReactNode;
}

export default function FacebookPostGenerator({ formData, trigger }: FacebookPostGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [generatedPost, setGeneratedPost] = useState("");
  const { toast } = useToast();

  const generateFacebookPost = (data: FormData) => {
    const endDate = new Date(data.endTime);
    const formattedEndTime = endDate.toLocaleDateString('en-AU', {
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Australia/Sydney'
    });

    const post = `🌟 OPAL AUCTION 🌟

💎 ${data.opalType}
⚖️ Weight: ${data.weight} carats
${data.description ? `📝 ${data.description}\n` : ''}${data.origin ? `🌍 Origin: ${data.origin}\n` : ''}${data.shape ? `🔸 Shape: ${data.shape}\n` : ''}
💰 Starting Bid: $${data.startingBid}
⏰ Ends: ${formattedEndTime} (AEDT)

🏷️ Group: ${data.facebookGroup}

📢 Bid in comments below!
#OpalAuction #AustralianOpals #Gems`;

    return post;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied!",
        description: "Facebook post copied to clipboard. Paste it in your Facebook group!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleOpenDialog = () => {
    const post = generateFacebookPost(formData);
    setGeneratedPost(post);
    setIsOpen(true);
  };

  const openFacebookGroups = () => {
    window.open("https://www.facebook.com/groups/search/groups/?q=opal%20auction", "_blank");
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild onClick={handleOpenDialog}>
        {trigger || (
          <Button 
            type="button"
            variant="outline" 
            className="flex items-center space-x-2"
            data-testid="button-generate-facebook-post"
          >
            <Facebook className="h-4 w-4" />
            <span>Generate Facebook Post</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Facebook className="h-5 w-5 text-blue-600" />
            <span>Facebook Post Generator</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Generated Post Preview
            </label>
            <Textarea
              value={generatedPost}
              onChange={(e) => setGeneratedPost(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
              placeholder="Your generated Facebook post will appear here..."
            />
          </div>
          
          <div className="flex flex-col space-y-2">
            <Button
              onClick={() => copyToClipboard(generatedPost)}
              className="flex items-center space-x-2"
              data-testid="button-copy-post"
            >
              <Copy className="h-4 w-4" />
              <span>Copy to Clipboard</span>
            </Button>
            
            <Button
              onClick={openFacebookGroups}
              variant="outline"
              className="flex items-center space-x-2"
              data-testid="button-open-facebook"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Open Facebook Groups</span>
            </Button>
          </div>
          
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Quick Steps:</strong>
            </p>
            <ol className="text-sm text-muted-foreground mt-1 space-y-1">
              <li>1. Copy the post above</li>
              <li>2. Open your Facebook group</li>
              <li>3. Paste and publish the post</li>
              <li>4. Come back and add the post URL to your auction for automatic monitoring!</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}