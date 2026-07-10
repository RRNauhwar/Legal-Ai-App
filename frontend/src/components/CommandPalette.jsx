import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { signOut } = useAuth();
  
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Command palette items list
  const items = useMemo(() => [
    // Navigation
    { id: 'nav-home', label: 'Go to Command Center (Dashboard)', category: 'Navigation', shortcut: 'G H', action: () => navigate('/') },
    { id: 'nav-cases', label: 'Go to Case Library', category: 'Navigation', shortcut: 'G C', action: () => navigate('/cases') },
    { id: 'nav-court', label: 'Go to Live Courtroom Simulation', category: 'Navigation', shortcut: 'G R', action: () => navigate('/courtroom') },
    { id: 'nav-academy', label: 'Go to Legal Academy', category: 'Navigation', shortcut: 'G A', action: () => navigate('/academy') },
    { id: 'nav-study', label: 'Go to AI Legal Assistant', category: 'Navigation', shortcut: 'G L', action: () => navigate('/study') },
    { id: 'nav-draft', label: 'Go to Drafting Desk', category: 'Navigation', shortcut: 'G D', action: () => navigate('/drafter') },
    { id: 'nav-community', label: 'Go to Community Arena', category: 'Navigation', shortcut: 'G M', action: () => navigate('/community') },
    { id: 'nav-leaderboard', label: 'Go to Rankings', category: 'Navigation', shortcut: 'G K', action: () => navigate('/leaderboard') },
    { id: 'nav-billing', label: 'Go to Billing & Recruiter Settings', category: 'Navigation', shortcut: 'G B', action: () => navigate('/career') },

    // Themes
    { id: 'theme-black', label: 'Switch Theme: Deep Obsidian Black', category: 'Theme Configuration', shortcut: 'T B', action: () => setTheme('black') },
    { id: 'theme-brown', label: 'Switch Theme: Classic Courtroom Brown', category: 'Theme Configuration', shortcut: 'T C', action: () => setTheme('brown') },
    { id: 'theme-blue', label: 'Switch Theme: Navy Seal Blue', category: 'Theme Configuration', shortcut: 'T N', action: () => setTheme('blue') },
    { id: 'theme-green', label: 'Switch Theme: Emerald Justice Green', category: 'Theme Configuration', shortcut: 'T G', action: () => setTheme('green') },

    // Actions
    { id: 'act-logout', label: 'Exit NyayaSim (Sign Out)', category: 'System Actions', shortcut: '⌥ X', action: () => signOut() }
  ], [navigate, signOut]);

  // Helper to update theme via document attribute
  function setTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('ns_theme', themeName);
  }

  // Handle opening/closing shortcut (CMD+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(open => !open);
        setSearch('');
        setSelectedIndex(0);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Autofocus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Close palette when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Filtered items based on search query
  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const query = search.toLowerCase();
    return items.filter(item => 
      item.label.toLowerCase().includes(query) || 
      item.category.toLowerCase().includes(query)
    );
  }, [search, items]);

  // Handle keyboard list navigation
  const handleListKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(idx => (idx + 1) % filteredItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(idx => (idx - 1 + filteredItems.length) % filteredItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
        setIsOpen(false);
      }
    }
  };

  // Reset selection index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  if (!isOpen) return null;

  return (
    <div style={styles.overlay}>
      <div ref={containerRef} style={styles.container}>
        <div style={styles.searchRow}>
          <svg style={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search citations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleListKeyDown}
            style={styles.input}
          />
          <span style={styles.escBadge}>ESC</span>
        </div>

        <div style={styles.resultsList}>
          {filteredItems.length > 0 ? (
            // Group items by category for UI grouping
            Object.entries(
              filteredItems.reduce((acc, item, index) => {
                if (!acc[item.category]) acc[item.category] = [];
                acc[item.category].push({ ...item, originalIndex: index });
                return acc;
              }, {})
            ).map(([category, catItems]) => (
              <div key={category} style={styles.categoryGroup}>
                <div style={styles.categoryHeader}>{category}</div>
                {catItems.map((item) => {
                  const isSelected = item.originalIndex === selectedIndex;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        item.action();
                        setIsOpen(false);
                      }}
                      onMouseEnter={() => setSelectedIndex(item.originalIndex)}
                      style={{
                        ...styles.itemRow,
                        ...(isSelected ? styles.itemRowSelected : {})
                      }}
                    >
                      <span style={styles.itemLabel}>{item.label}</span>
                      {item.shortcut && <kbd style={styles.kbd}>{item.shortcut}</kbd>}
                    </div>
                  );
                })}
              </div>
            ))
          ) : (
            <div style={styles.noResults}>No commands found matching "{search}"</div>
          )}
        </div>

        <div style={styles.footer}>
          <div style={styles.footerText}>
            <span>↑↓ to navigate</span>
            <span>↵ to select</span>
            <span>cmd+k to toggle</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Scoped inline CSS style tokens matching the design system
const styles = {
  overlay: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(6, 10, 20, 0.75)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    zIndex: 99999,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: '10vh'
  },
  container: {
    width: '100%',
    maxWidth: '560px',
    background: 'var(--navy-mid)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    boxShadow: 'var(--shadow-md)',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  searchRow: {
    display: 'flex',
    alignItems: 'center',
    padding: '0.85rem 1rem',
    borderBottom: '1px solid var(--border)',
    gap: '10px'
  },
  searchIcon: {
    width: '18px',
    height: '18px',
    color: 'var(--gold)',
    opacity: 0.8
  },
  input: {
    flex: 1,
    border: 'none',
    outline: 'none',
    fontSize: '14px',
    fontFamily: 'var(--f-body)',
    color: 'var(--white)',
    background: 'transparent',
    padding: 0
  },
  escBadge: {
    fontSize: '9px',
    fontFamily: 'var(--f-mono)',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)',
    padding: '2px 5px',
    borderRadius: '2px'
  },
  resultsList: {
    maxHeight: '320px',
    overflowY: 'auto',
    padding: '0.5rem 0'
  },
  categoryGroup: {
    marginBottom: '0.5rem'
  },
  categoryHeader: {
    fontSize: '9px',
    fontFamily: 'var(--f-mono)',
    color: 'var(--gold)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    padding: '0.5rem 1rem 0.25rem 1rem',
    opacity: 0.6
  },
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'between',
    padding: '0.6rem 1.2rem',
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s'
  },
  itemRowSelected: {
    background: 'rgba(201, 168, 76, 0.12)',
    borderLeft: '2px solid var(--gold)',
    paddingLeft: 'calc(1.2rem - 2px)'
  },
  itemLabel: {
    flex: 1,
    fontSize: '13px',
    color: 'var(--text-main)'
  },
  kbd: {
    fontSize: '9px',
    fontFamily: 'var(--f-mono)',
    color: 'var(--text-muted)',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid var(--border)',
    padding: '1px 4px',
    borderRadius: '2px',
    letterSpacing: '1px'
  },
  noResults: {
    padding: '2rem 1rem',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '13px'
  },
  footer: {
    borderTop: '1px solid var(--border)',
    padding: '0.4rem 1rem',
    background: 'rgba(255, 255, 255, 0.01)'
  },
  footerText: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    fontSize: '9px',
    fontFamily: 'var(--f-mono)',
    color: 'var(--text-muted)',
    opacity: 0.7
  }
};
