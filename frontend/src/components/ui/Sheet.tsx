'use client';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

// لوح منزلق (Drawer) مبني على Radix Dialog — RTL أصيل ووصولية كاملة (mds/13)
export function Sheet({
  open, onOpenChange, side = 'start', title, children, widthClass = 'w-full max-w-md',
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  side?: 'start' | 'end' | 'bottom';
  title?: string;
  children: React.ReactNode;
  widthClass?: string;
}) {
  const pos =
    side === 'bottom'
      ? 'inset-x-0 bottom-0 w-full rounded-t-2xl max-h-[85vh] data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom'
      : side === 'end'
        ? 'inset-y-0 end-0 h-full ltr:right-0 rtl:left-0 data-[state=open]:animate-in data-[state=open]:slide-in-from-left'
        : 'inset-y-0 start-0 h-full data-[state=open]:animate-in data-[state=open]:slide-in-from-right';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in" />
        <Dialog.Content className={cn('fixed z-50 bg-card text-card-foreground shadow-luxe flex flex-col', pos, side !== 'bottom' && widthClass)}>
          <div className="flex items-center justify-between p-4 border-b">
            <Dialog.Title className="font-extrabold text-lg">{title}</Dialog.Title>
            <Dialog.Close className="rounded-lg p-1 hover:bg-muted transition"><X size={20} /></Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto p-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
