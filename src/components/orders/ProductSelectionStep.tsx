import React, { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { motion } from "framer-motion";
import ImageModal from "./ImageModal";
import OrderSummary from "./OrderSummary";
import { REGIONS, AS_CONDITIONS } from "./constants";
import type { LeadProduct } from "@/types/order";
import type { CartItem } from "./types";

interface ProductSelectionStepProps {
  products: LeadProduct[];
  cart: CartItem[];
  selections: Record<string, boolean>;
  onCheckboxChange: (productId: number, product: LeadProduct, region: string, checked: boolean) => void;
  onQuantityChange: (cartKey: string, quantity: number) => void;
  onRemoveItem: (cartKey: string) => void;
  onNext: () => void;
}

const CheckboxList = React.memo(function CheckboxList({
  groupedProducts,
  selections,
  onCheckboxChange,
  onImageClick,
}: {
  groupedProducts: Record<string, LeadProduct[]>;
  selections: Record<string, boolean>;
  onCheckboxChange: (productId: number, product: LeadProduct, region: string, checked: boolean) => void;
  onImageClick: (src: string, alt: string) => void;
}) {
  return (
    <div className="space-y-6">
      {Object.entries(groupedProducts).map(([dbType, products]) => (
        <div
          key={dbType}
          className="overflow-hidden rounded-lg border-2 border-primary/20"
        >
          <div className="p-4 bg-slate-800">
            <div className="flex flex-col gap-1">
              <div className="flex items-center">
                <h4 className="font-medium text-lg text-white">{dbType}업체</h4>
                <span className="ml-2 text-sm text-yellow-400 font-medium">
                  (90년생은 납품하지 않습니다.)
                </span>
              </div>
              <div className="text-sm text-yellow-300 font-medium">
                {AS_CONDITIONS.notes.slice(0, 3).map((note, i) => (
                  <div key={i}>- {note}</div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 bg-background">
            <div className="flex gap-2 mb-4">
              {AS_CONDITIONS.images.map((img) => (
                <Button
                  key={img.label}
                  size="sm"
                  onClick={() => onImageClick(img.src, img.label)}
                  className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white border-red-600"
                >
                  <Check className="h-4 w-4" />
                  {img.label}
                </Button>
              ))}
            </div>

            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md mb-4">
              <p className="font-bold text-destructive">A/S 불가 항목</p>
              {AS_CONDITIONS.asBlocked.map((rule, i) => (
                <p key={i}>- {rule}</p>
              ))}
            </div>

            <Accordion type="multiple" className="w-full">
              {products.map((product) => (
                <AccordionItem value={String(product.id)} key={product.id}>
                  <AccordionTrigger>
                    <div className="text-left">
                      <div className="font-bold text-lg">
                        {product.name} ({product.price.toLocaleString()}원)
                      </div>
                      {product.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {product.description}
                        </p>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-2">
                      {REGIONS.map((region) => {
                        const key = `${product.id}-${region}`;
                        return (
                          <div
                            key={region}
                            className="flex items-center space-x-1 p-2 rounded-md hover:bg-muted/50"
                          >
                            <Checkbox
                              id={key}
                              checked={selections[key] || false}
                              onCheckedChange={(checked) =>
                                onCheckboxChange(product.id, product, region, !!checked)
                              }
                            />
                            <Label htmlFor={key} className="text-sm font-medium cursor-pointer">
                              {region}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      ))}
    </div>
  );
});

export default function ProductSelectionStep({
  products,
  cart,
  selections,
  onCheckboxChange,
  onQuantityChange,
  onRemoveItem,
  onNext,
}: ProductSelectionStepProps) {
  const [imageModal, setImageModal] = useState({
    isOpen: false,
    imageSrc: "",
    imageAlt: "",
  });

  const groupedProducts = products.reduce<Record<string, LeadProduct[]>>(
    (acc, p) => {
      (acc[p.dbType] = acc[p.dbType] || []).push(p);
      return acc;
    },
    {}
  );

  return (
    <>
      <p className="text-sm text-center text-muted-foreground mb-6">
        상품을 클릭하시면 지역을 선택하실 수 있습니다.
      </p>

      <div className="lg:flex lg:gap-8 lg:justify-center">
        <motion.div
          layout
          className={cart.length > 0 ? "lg:w-2/3" : "lg:w-full lg:max-w-3xl"}
        >
          <div className="space-y-6 pb-80 lg:pb-6">
            <CheckboxList
              groupedProducts={groupedProducts}
              selections={selections}
              onCheckboxChange={onCheckboxChange}
              onImageClick={(src, alt) =>
                setImageModal({ isOpen: true, imageSrc: src, imageAlt: alt })
              }
            />
          </div>
        </motion.div>

        <OrderSummary
          items={cart}
          onQuantityChange={onQuantityChange}
          onRemoveItem={onRemoveItem}
          onNext={onNext}
        />
      </div>

      <ImageModal
        isOpen={imageModal.isOpen}
        onClose={() =>
          setImageModal({ isOpen: false, imageSrc: "", imageAlt: "" })
        }
        imageSrc={imageModal.imageSrc}
        imageAlt={imageModal.imageAlt}
      />
    </>
  );
}
