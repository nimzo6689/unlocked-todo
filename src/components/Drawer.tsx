import { X } from 'lucide-react';
import {
  Drawer as UiDrawer,
  DrawerContent,
  DrawerClose,
  DrawerTitle,
  DrawerHeader,
  DrawerOverlay,
} from './ui/drawer';

export type DrawerItem = {
  label: string;
  path: string;
};

type DrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: DrawerItem[];
  onSelect?: (path: string) => void;
};

export const Drawer = ({ open, onOpenChange, items, onSelect }: DrawerProps) => {
  return (
    <UiDrawer open={open} onOpenChange={onOpenChange} direction="left">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerHeader className="flex items-center justify-between gap-2 p-4">
          <DrawerTitle>メニュー</DrawerTitle>
          <DrawerClose asChild>
            <button
              className="rounded-md p-1 text-slate-500 hover:text-slate-700"
              aria-label="閉じる"
            >
              <X size={18} />
            </button>
          </DrawerClose>
        </DrawerHeader>

        <nav className="px-4 pb-4">
          <ul className="space-y-2">
            {items.map(item => (
              <li key={item.path}>
                <button
                  onClick={() => {
                    onSelect?.(item.path);
                    onOpenChange(false);
                  }}
                  className="w-full text-left py-2 px-3 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </DrawerContent>
    </UiDrawer>
  );
};

