/**
 * Guardian Desktop ERP - ADA Code Autocomplete Component
 * Provides autocomplete functionality for dental procedure codes
 */

import React, { useState, useRef, useEffect } from 'react';
import { searchADACodes } from '../../data/adaCodes';

const ADACodeAutocomplete = ({
  value,
  onChange,
  onSelect,
  placeholder = 'D0120',
  className = '',
  inputClassName = '',
  disabled = false,
  showDescription = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search for suggestions when value changes
  useEffect(() => {
    if (value && value.length >= 1) {
      const results = searchADACodes(value, 8);
      setSuggestions(results);
      setIsOpen(results.length > 0);
      setHighlightedIndex(0);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  }, [value]);

  const handleInputChange = (e) => {
    const newValue = e.target.value.toUpperCase();
    onChange(newValue);
  };

  const handleSelect = (item) => {
    if (onSelect) {
      onSelect(item);
    } else {
      onChange(item.code);
    }
    setIsOpen(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (suggestions[highlightedIndex]) {
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      case 'Tab':
        if (suggestions[highlightedIndex]) {
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
      default:
        break;
    }
  };

  const handleFocus = () => {
    if (value && value.length >= 1) {
      const results = searchADACodes(value, 8);
      if (results.length > 0) {
        setSuggestions(results);
        setIsOpen(true);
      }
    }
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        placeholder={placeholder}
        disabled={disabled}
        className={`input w-full ${inputClassName}`}
        autoComplete="off"
      />
      
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {suggestions.map((item, index) => (
            <div
              key={item.code}
              onClick={() => handleSelect(item)}
              className={`px-3 py-2 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors ${
                index === highlightedIndex
                  ? 'bg-guardian-100 dark:bg-guardian-900'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-guardian-600 dark:text-guardian-400 text-sm">
                  {item.code}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                  {item.category}
                </span>
              </div>
              {showDescription && (
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                  {item.description}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ADACodeAutocomplete;
