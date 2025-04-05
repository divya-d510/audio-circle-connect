
import React from 'react';
import { Volume2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';

const Header: React.FC = () => {
  return (
    <div className="flex items-center justify-between p-4 bg-background border-b">
      <div className="flex items-center">
        <Volume2 className="text-audio-primary mr-2" />
        <h1 className="text-xl font-bold">Audio Circle</h1>
      </div>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Settings
        </TooltipContent>
      </Tooltip>
    </div>
  );
};

export default Header;
