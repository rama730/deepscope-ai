"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Clock, X, TrendingUp } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import { useOnClickOutside } from "@/hooks/useOnClickOutside";

interface SearchAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  placeholder?: string;
  id?: string;
}

export default function SearchAutocomplete({
  value,
  onChange,
  onSearch,
  placeholder = "Search projects...",
  id = "hub-search",
}: SearchAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const supabase = createSupabaseBrowserClient();
  const { recentSearches, addSearch } = useSearchHistory();
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(dropdownRef as React.RefObject<HTMLElement>, () => setIsOpen(false));

  // Fetch search suggestions
  useEffect(() => {
    if (!value.trim() || value.length < 2) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {

      try {
        // Search for projects matching the query
        const { data, error } = await supabase
          .from("projects")
          .select("title, tags, technologies_used")
          .or(`title.ilike.%${value}%,description.ilike.%${value}%`)
          .limit(5);

        if (error) throw error;

        // Extract unique suggestions from titles, tags, and technologies
        const uniqueSuggestions = new Set<string>();
        data?.forEach((project: any) => {
          const title = project.title as string;
          if (title.toLowerCase().includes(value.toLowerCase())) {
            uniqueSuggestions.add(project.title);
          }
          project.tags?.forEach((tag: string) => {
            if (tag.toLowerCase().includes(value.toLowerCase())) {
              uniqueSuggestions.add(tag);
            }
          });
          project.technologies_used?.forEach((tech: string) => {
            if (tech.toLowerCase().includes(value.toLowerCase())) {
              uniqueSuggestions.add(tech);
            }
          });
        });

        setSuggestions(Array.from(uniqueSuggestions).slice(0, 5));
      } catch (error) {
        console.error("Error fetching suggestions:", error);
        setSuggestions([]);
      } finally {

      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(debounceTimer);
  }, [value, supabase]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsOpen(true);
    setSelectedIndex(-1);
  };

  const handleInputFocus = () => {
    if (value || recentSearches.length > 0) {
      setIsOpen(true);
    }
  };

  const handleSelect = (suggestion: string) => {
    onChange(suggestion);
    setIsOpen(false);
    onSearch(suggestion);
    addSearch(suggestion);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) return;

    const items = [...suggestions, ...recentSearches.map((s) => s.query)];
    const maxIndex = items.length - 1;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < maxIndex ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < items.length) {
        const selectedItem = items[selectedIndex] as string;
        handleSelect(selectedItem);
      } else if (value.trim()) {
        onSearch(value);
        addSearch(value);
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setSelectedIndex(-1);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSearch(value);
      addSearch(value);
      setIsOpen(false);
    }
  };

  const displayItems = isOpen && (suggestions.length > 0 || recentSearches.length > 0);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            ref={inputRef}
            id={id}
            type="text"
            value={value}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            aria-label="Search projects"
            aria-expanded={isOpen}
            aria-autocomplete="list"
            aria-controls="search-autocomplete-list"
          />
          {value && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-600 dark:text-zinc-400 dark:hover:text-zinc-300 rounded transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>

      {displayItems && (
        <div
          id="search-autocomplete-list"
          className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg max-h-64 overflow-y-auto"
          role="listbox"
        >
          {suggestions.length > 0 && (
            <div className="p-2">
              <div className="px-2 py-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">
                Suggestions
              </div>
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => handleSelect(suggestion)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${selectedIndex === index
                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                    : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                    }`}
                  role="option"
                  aria-selected={selectedIndex === index}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span className="truncate">{suggestion}</span>
                </button>
              ))}
            </div>
          )}

          {recentSearches.length > 0 && (
            <div className="p-2 border-t border-zinc-200 dark:border-zinc-800">
              <div className="px-2 py-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase">
                Recent Searches
              </div>
              {recentSearches.map((item, index) => {
                const displayIndex = suggestions.length + index;
                return (
                  <button
                    key={`${item.query}-${item.timestamp}`}
                    type="button"
                    onClick={() => handleSelect(item.query)}
                    onMouseEnter={() => setSelectedIndex(displayIndex)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${selectedIndex === displayIndex
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                      : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                      }`}
                    role="option"
                    aria-selected={selectedIndex === displayIndex}
                  >
                    <Clock className="w-4 h-4" />
                    <span className="truncate flex-1 text-left">{item.query}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
