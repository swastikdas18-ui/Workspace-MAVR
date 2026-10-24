import React, { useState, useEffect, useRef, useMemo, useId } from 'react';
import { Search, ChevronDown, Check, X, UserX, AlertCircle } from 'lucide-react';
import { User } from '../../types';
import { UserAvatar } from '../common/UserAvatar';
import { RoleBadge } from '../common/RoleBadge';

export interface AssigneePickerProps {
  users: User[];
  selectedUserId: string;
  onSelectUser: (userId: string) => void;
  disabled?: boolean;
  allowClear?: boolean;
  label?: string;
  placeholder?: string;
  className?: string;
}

export const AssigneePicker: React.FC<AssigneePickerProps> = ({
  users,
  selectedUserId,
  onSelectUser,
  disabled = false,
  allowClear = false,
  label = 'Assignee',
  placeholder = 'Select team member...',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLUListElement>(null);

  const pickerId = useId();
  const listboxId = `${pickerId}-listbox`;
  const labelId = `${pickerId}-label`;

  // Currently selected user object (memoized)
  const selectedUser = useMemo(() => {
    if (!selectedUserId) return null;
    return users.find((u) => u.id === selectedUserId) || null;
  }, [users, selectedUserId]);

  // Efficient client-side filtering by normalized search query (name or email)
  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return users;
    }
    return users.filter((u) => {
      const nameMatch = u.name?.toLowerCase().includes(q);
      const emailMatch = u.email?.toLowerCase().includes(q);
      const titleMatch = u.title?.toLowerCase().includes(q);
      return nameMatch || emailMatch || titleMatch;
    });
  }, [users, searchQuery]);

  // Keep highlighted index in bounds
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  // Focus search input when popover opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setHighlightedIndex(0);
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick, true);
    document.addEventListener('touchstart', handleOutsideClick, true);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick, true);
      document.removeEventListener('touchstart', handleOutsideClick, true);
    };
  }, [isOpen]);

  // Keyboard navigation inside listbox & search
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(false);
      triggerRef.current?.focus();
      return;
    }

    const totalOptions = filteredUsers.length + (allowClear ? 1 : 0);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      setHighlightedIndex((prev) => (prev + 1 < totalOptions ? prev + 1 : 0));
      scrollOptionIntoView(highlightedIndex + 1 < totalOptions ? highlightedIndex + 1 : 0);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : Math.max(0, totalOptions - 1)));
      scrollOptionIntoView(highlightedIndex - 1 >= 0 ? highlightedIndex - 1 : Math.max(0, totalOptions - 1));
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();

      if (allowClear && highlightedIndex === 0) {
        onSelectUser('');
        setIsOpen(false);
        triggerRef.current?.focus();
        return;
      }

      const userIndex = allowClear ? highlightedIndex - 1 : highlightedIndex;
      const targetUser = filteredUsers[userIndex];
      if (targetUser) {
        onSelectUser(targetUser.id);
        setIsOpen(false);
        triggerRef.current?.focus();
      }
      return;
    }

    if (e.key === 'Tab') {
      setIsOpen(false);
    }
  };

  const scrollOptionIntoView = (index: number) => {
    if (!listboxRef.current) return;
    const items = listboxRef.current.querySelectorAll('[role="option"]');
    const targetItem = items[index] as HTMLElement;
    if (targetItem) {
      targetItem.scrollIntoView({ block: 'nearest' });
    }
  };

  const handleSelect = (userId: string) => {
    onSelectUser(userId);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`} ref={containerRef} onKeyDown={handleKeyDown}>
      {label && (
        <label id={labelId} className="block text-xs font-medium text-slate-300 mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-labelledby={label ? `${labelId} ${pickerId}-value` : undefined}
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
        className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl bg-[#171A21] border transition-all text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#B8FF3B]/30 ${
          isOpen
            ? 'border-[#B8FF3B]/60 shadow-[0_0_12px_rgba(184,255,59,0.12)]'
            : 'border-[#2A303D] hover:border-[#3E4656]'
        } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-900' : ''}`}
      >
        <div id={`${pickerId}-value`} className="flex items-center gap-2.5 min-w-0 flex-1">
          {selectedUser ? (
            <>
              <UserAvatar
                user={{ name: selectedUser.name, avatar: selectedUser.avatar }}
                size="sm"
                className="ring-1 ring-white/10 shrink-0"
              />
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="text-xs font-semibold text-white truncate">{selectedUser.name}</span>
                <RoleBadge role={selectedUser.role} size="sm" showIcon={false} />
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-slate-400 text-xs">
              <UserX className="w-4 h-4 text-slate-500" />
              <span>{placeholder}</span>
            </div>
          )}
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-[#B8FF3B]' : ''
          }`}
        />
      </button>

      {/* Popover / Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute z-50 left-0 right-0 mt-1.5 bg-[#171A21] border border-[#2A303D] rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[320px]"
          style={{ minWidth: '260px' }}
        >
          {/* Search Box Header */}
          <div className="p-2 border-b border-[#2A303D] bg-[#111318]">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email..."
                className="w-full bg-[#1D212B] border border-[#2A303D] rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#B8FF3B]/50 transition-colors"
                onKeyDown={(e) => {
                  // Prevent Enter from submitting parent form
                  if (e.key === 'Enter') {
                    e.preventDefault();
                  }
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick stats for enterprise scale */}
            <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1 px-1">
              <span>
                {filteredUsers.length} of {users.length} members
              </span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-[#B8FF3B] hover:underline cursor-pointer"
                >
                  Clear search
                </button>
              )}
            </div>
          </div>

          {/* Listbox */}
          <ul
            id={listboxId}
            ref={listboxRef}
            role="listbox"
            tabIndex={-1}
            aria-label="Workspace team members"
            className="overflow-y-auto flex-1 p-1 space-y-0.5 focus:outline-none"
          >
            {/* Optional Unassigned Option */}
            {allowClear && (
              <li
                role="option"
                aria-selected={!selectedUserId}
                onClick={() => handleSelect('')}
                onMouseEnter={() => setHighlightedIndex(0)}
                className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer text-xs transition-colors ${
                  highlightedIndex === 0 ? 'bg-[#242936] text-white' : 'text-slate-300 hover:bg-[#1D212B]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                    <UserX className="w-3.5 h-3.5" />
                  </div>
                  <span className="font-medium text-slate-300">Unassigned</span>
                </div>
                {!selectedUserId && <Check className="w-4 h-4 text-[#B8FF3B]" />}
              </li>
            )}

            {/* Empty Search Results */}
            {filteredUsers.length === 0 && (
              <li className="px-3 py-6 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-slate-500" />
                <span>No members found matching &quot;{searchQuery}&quot;</span>
                <span className="text-[10px] text-slate-500">Check spelling or search by email.</span>
              </li>
            )}

            {/* Member Rows */}
            {filteredUsers.map((u, index) => {
              const optionIndex = allowClear ? index + 1 : index;
              const isSelected = u.id === selectedUserId;
              const isHighlighted = highlightedIndex === optionIndex;

              return (
                <li
                  key={u.id}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(u.id)}
                  onMouseEnter={() => setHighlightedIndex(optionIndex)}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer transition-colors ${
                    isHighlighted ? 'bg-[#242936]' : 'hover:bg-[#1D212B]'
                  } ${isSelected ? 'border-l-2 border-[#B8FF3B] pl-2' : ''}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <UserAvatar
                      user={{ name: u.name, avatar: u.avatar }}
                      size="sm"
                      className="shrink-0"
                    />

                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-white truncate">{u.name}</span>
                        <RoleBadge role={u.role} size="sm" showIcon={false} />
                      </div>

                      {u.email && (
                        <span className="text-[11px] text-slate-400 truncate">{u.email}</span>
                      )}
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="w-4 h-4 text-[#B8FF3B] shrink-0 ml-2" aria-hidden="true" />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
