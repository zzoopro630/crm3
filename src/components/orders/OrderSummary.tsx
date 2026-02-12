import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { CartItem } from "./types";

interface OrderSummaryProps {
  items: CartItem[];
  onQuantityChange: (cartKey: string, quantity: number) => void;
  onRemoveItem: (cartKey: string) => void;
  onNext: () => void;
  isScrollable?: boolean;
}

function SummaryContent({
  items,
  onQuantityChange,
  onRemoveItem,
  onNext,
  isScrollable,
}: OrderSummaryProps) {
  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const scrollClasses = isScrollable ? "max-h-48 overflow-y-auto" : "";

  return (
    <div className="space-y-4">
      <div className={`p-4 border rounded-md space-y-2 ${scrollClasses}`}>
        <h3 className="font-semibold text-md">신청 내역</h3>
        {items.map((item, index) => (
          <div key={item.cartKey} className="p-3 bg-muted/50 rounded-md space-y-2">
            <div className="font-medium text-sm whitespace-nowrap overflow-hidden text-ellipsis">
              {index + 1}. {item.product.name} ({item.region})
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-0">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-r-none"
                  onClick={() =>
                    onQuantityChange(item.cartKey, Math.max(1, item.quantity - 1))
                  }
                >
                  -
                </Button>
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) =>
                    onQuantityChange(
                      item.cartKey,
                      Math.max(1, parseInt(e.target.value, 10) || 1)
                    )
                  }
                  className="w-16 h-8 text-center rounded-none border-l-0 border-r-0 [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  min="1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 rounded-l-none"
                  onClick={() => onQuantityChange(item.cartKey, item.quantity + 1)}
                >
                  +
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end">
                  <span className="text-xs text-muted-foreground">
                    단가: {item.product.price.toLocaleString()}원
                  </span>
                  <span className="font-bold text-primary text-base">
                    {(item.product.price * item.quantity).toLocaleString()}원
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveItem(item.cartKey)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="text-xl font-bold text-right bg-primary/5 p-4 rounded-md border-2 border-primary/20">
        총 금액: {total.toLocaleString()}원
      </div>
      <Button onClick={onNext} className="w-full" disabled={items.length === 0}>
        다음
      </Button>
    </div>
  );
}

export default function OrderSummary(props: OrderSummaryProps) {
  const { items } = props;

  return (
    <AnimatePresence>
      {items.length > 0 && (
        <>
          {/* 모바일: 하단 고정 */}
          <motion.div
            className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4 z-40"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "tween", ease: "easeInOut" }}
          >
            <SummaryContent {...props} isScrollable />
          </motion.div>

          {/* 데스크톱: 우측 Sticky */}
          <motion.div
            className="hidden lg:block lg:w-1/3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ ease: "easeInOut", duration: 0.4 }}
          >
            <div className="sticky top-8 space-y-4">
              <div className="border rounded-lg shadow-lg p-6">
                <SummaryContent {...props} />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
