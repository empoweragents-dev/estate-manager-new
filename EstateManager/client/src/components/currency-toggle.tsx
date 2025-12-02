import { Button } from "@/components/ui/button";
import { useCurrencyStore } from "@/lib/currency";

export function CurrencyToggle() {
  const { currency, setCurrency } = useCurrencyStore();

  return (
    <div className="flex items-center gap-1">
      <Button
        variant={currency === 'BDT' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => setCurrency('BDT')}
        className="h-8 px-3 text-sm font-medium"
        data-testid="button-currency-bdt"
      >
        ৳ BDT
      </Button>
    </div>
  );
}
