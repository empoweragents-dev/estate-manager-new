import { useState, useEffect, useRef } from "react";
import { Search, User, Store, FileText, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatCurrency, useCurrencyStore } from "@/lib/currency";

interface SearchResult {
  type: 'tenant' | 'shop' | 'lease';
  id: number;
  title: string;
  subtitle: string;
  extra?: string;
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { currency, exchangeRate } = useCurrencyStore();

  const { data: results = [], isLoading } = useQuery<SearchResult[]>({
    queryKey: ['/api/search', query],
    enabled: query.length >= 2,
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (event.key === 'Escape') {
        setIsOpen(false);
        setQuery("");
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'tenant': return <User className="h-4 w-4 text-blue-500" />;
      case 'shop': return <Store className="h-4 w-4 text-emerald-500" />;
      case 'lease': return <FileText className="h-4 w-4 text-purple-500" />;
      default: return null;
    }
  };

  const getLink = (result: SearchResult) => {
    switch (result.type) {
      case 'tenant': return `/tenants/${result.id}`;
      case 'shop': return `/shops/${result.id}`;
      case 'lease': return `/leases/${result.id}`;
      default: return '/';
    }
  };

  const groupedResults = {
    tenants: results.filter(r => r.type === 'tenant'),
    shops: results.filter(r => r.type === 'shop'),
    leases: results.filter(r => r.type === 'lease'),
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="search"
          placeholder="Search tenants, shops, leases... (⌘K)"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pl-9 pr-9 h-9 bg-muted/50"
          data-testid="input-global-search"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            data-testid="button-clear-search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && query.length >= 2 && (
        <div className="absolute top-full mt-2 w-full bg-popover border border-popover-border rounded-md shadow-lg z-50 overflow-hidden">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No results found for "{query}"
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {groupedResults.tenants.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50">
                    Tenants
                  </div>
                  {groupedResults.tenants.map((result) => (
                    <Link
                      key={`tenant-${result.id}`}
                      href={getLink(result)}
                      onClick={() => {
                        setIsOpen(false);
                        setQuery("");
                      }}
                    >
                      <div
                        className="flex items-center gap-3 px-3 py-2 hover-elevate cursor-pointer"
                        data-testid={`search-result-tenant-${result.id}`}
                      >
                        {getIcon(result.type)}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{result.title}</div>
                          <div className="text-sm text-muted-foreground truncate">{result.subtitle}</div>
                        </div>
                        {result.extra && (
                          <div className="text-sm font-medium text-amber-600 dark:text-amber-400">
                            {result.extra}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
              
              {groupedResults.shops.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50">
                    Shops
                  </div>
                  {groupedResults.shops.map((result) => (
                    <Link
                      key={`shop-${result.id}`}
                      href={getLink(result)}
                      onClick={() => {
                        setIsOpen(false);
                        setQuery("");
                      }}
                    >
                      <div
                        className="flex items-center gap-3 px-3 py-2 hover-elevate cursor-pointer"
                        data-testid={`search-result-shop-${result.id}`}
                      >
                        {getIcon(result.type)}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{result.title}</div>
                          <div className="text-sm text-muted-foreground truncate">{result.subtitle}</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {groupedResults.leases.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-muted/50">
                    Leases
                  </div>
                  {groupedResults.leases.map((result) => (
                    <Link
                      key={`lease-${result.id}`}
                      href={getLink(result)}
                      onClick={() => {
                        setIsOpen(false);
                        setQuery("");
                      }}
                    >
                      <div
                        className="flex items-center gap-3 px-3 py-2 hover-elevate cursor-pointer"
                        data-testid={`search-result-lease-${result.id}`}
                      >
                        {getIcon(result.type)}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{result.title}</div>
                          <div className="text-sm text-muted-foreground truncate">{result.subtitle}</div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
