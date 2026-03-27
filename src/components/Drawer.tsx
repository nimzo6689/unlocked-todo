import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

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
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className={`drawer-overlay ${open ? 'open' : 'closed'}`}
          forceMount
        />
        <Dialog.Content
          className={`drawer-content ${open ? 'open' : 'closed'}`}
          forceMount
          onEscapeKeyDown={() => onOpenChange(false)}
          onPointerDownOutside={() => onOpenChange(false)}
        >
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-lg font-bold">メニュー</Dialog.Title>
            <Dialog.Close asChild>
              <button
                className="rounded-md p-1 text-slate-500 hover:text-slate-700"
                aria-label="閉じる"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <nav>
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

