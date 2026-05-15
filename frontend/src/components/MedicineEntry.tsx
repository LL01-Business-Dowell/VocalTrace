import { useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ImagePlus, X } from 'lucide-react';

interface MedicineFormData {
  medId: string;
  name: string;
  dosage: string;
  imageUrl: string;
  audioUrl: string;
  notes: string;
}

interface Props {
  data: MedicineFormData;
  onChange: (data: MedicineFormData) => void
}

export default function MedicineEntry({ data, onChange }: Props) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = (field: keyof MedicineFormData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Please select an image file.', variant: 'destructive' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Image must be under 5MB.', variant: 'destructive' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      update('imageUrl', reader.result as string);
      toast({ title: 'Image attached', description: file.name });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3 animate-fade-in">
      <span className="text-sm font-semibold text-muted-foreground">Medicine Details</span>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Medicine Name *</label>
          <Input placeholder="e.g. Amoxicillin" value={data.name} onChange={(e) => update('name', e.target.value)} />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Dosage *</label>
          <Input placeholder="e.g. 500mg 3x daily" value={data.dosage} onChange={(e) => update('dosage', e.target.value)} />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Notes</label>
        <Textarea placeholder="Additional notes..." value={data.notes} onChange={(e) => update('notes', e.target.value)} rows={2} />
      </div>

      {/* Image preview */}
      {/* {data.imageUrl && (
        <div className="relative inline-block">
          <img src={data.imageUrl} alt="Medicine" className="w-24 h-24 object-cover rounded-lg border border-border" />
          <button
            type="button"
            onClick={() => update('imageUrl', '')}
            className="absolute -top-2 -right-2 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )} */}

      {/* <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="text-xs">
          <ImagePlus className="w-3.5 h-3.5 mr-1" />
          {data.imageUrl ? 'Change Image' : 'Upload Image'}
        </Button>
      </div> */}
    </div>
  );
}
