import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Upload } from 'lucide-react@0.487.0';
import { api } from '../utils/api';

interface ReportItemDialogProps {
  type: 'lost' | 'found';
  onSuccess: () => void;
}

const CATEGORIES = [
  'Electronics',
  'Books & Stationery',
  'Clothing & Accessories',
  'Keys & Cards',
  'Bags & Wallets',
  'Sports Equipment',
  'Jewelry',
  'Documents',
  'Other',
];

export function ReportItemDialog({ type, onSuccess }: ReportItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!category) {
      alert('Please select a category');
      return;
    }
    
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.append('type', type);
    formData.append('category', category);
    
    if (selectedFile) {
      formData.append('image', selectedFile);
    }

    try {
      await api.createItem(formData);
      // Reset form
      if (e.currentTarget) {
        e.currentTarget.reset();
      }
      setSelectedFile(null);
      setCategory('');
      setOpen(false);
      onSuccess();
    } catch (err: any) {
      console.error('Failed to create item:', err);
      alert(err.message || 'Failed to create item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Report {type === 'lost' ? 'Lost' : 'Found'} Item
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Report {type === 'lost' ? 'Lost' : 'Found'} Item</DialogTitle>
          <DialogDescription>
            Provide details about the item to help reunite it with its owner
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Item Name *</Label>
            <Input
              id="title"
              name="title"
              placeholder="e.g., Blue Backpack"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Provide details like color, brand, distinctive features..."
              rows={3}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location *</Label>
            <Input
              id="location"
              name="location"
              placeholder="e.g., Library 2nd Floor"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">
              Date {type === 'lost' ? 'Lost' : 'Found'} *
            </Label>
            <Input
              id="date"
              name="date"
              type="date"
              max={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image">Photo (Optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="flex-1"
              />
              {selectedFile && (
                <Upload className="h-5 w-5 text-green-600" />
              )}
            </div>
            {selectedFile && (
              <p className="text-sm text-gray-500">
                Selected: {selectedFile.name}
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? 'Submitting...' : 'Submit'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
