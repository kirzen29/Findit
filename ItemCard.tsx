import { Card, CardContent, CardFooter } from './ui/card';
import { Badge } from './ui/badge';
import { MapPin, Calendar } from 'lucide-react@0.487.0';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface Item {
  id: string;
  type: 'lost' | 'found';
  category: string;
  title: string;
  description: string;
  location: string;
  date: string;
  imageUrl?: string;
  status: string;
}

interface ItemCardProps {
  item: Item;
  onClick: () => void;
}

export function ItemCard({ item, onClick }: ItemCardProps) {
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow overflow-hidden"
      onClick={onClick}
    >
      {item.imageUrl && (
        <div className="aspect-video w-full overflow-hidden bg-gray-100">
          <ImageWithFallback
            src={item.imageUrl}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="line-clamp-1">{item.title}</h3>
          <Badge variant={item.type === 'lost' ? 'destructive' : 'default'}>
            {item.type === 'lost' ? 'Lost' : 'Found'}
          </Badge>
        </div>
        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{item.description}</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <MapPin className="h-4 w-4" />
            <span className="line-clamp-1">{item.location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="h-4 w-4" />
            <span>{new Date(item.date).toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Badge variant="outline" className="text-xs">
          {item.category}
        </Badge>
      </CardFooter>
    </Card>
  );
}
