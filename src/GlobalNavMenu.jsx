import { useEffect, useRef, useState } from 'react';
import { globalNavigationDestinations } from './globalNavigation';

export default function GlobalNavigation({
  activeDestination,
  onNavigate,
  contextualAction = null,
  hidden = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const firstItemRef = useRef(null);

  function closeMenu({ restoreFocus = true } = {}) {
    setIsOpen(false);
    if (restoreFocus) window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function selectDestination(destinationId) {
    closeMenu({ restoreFocus: false });
    onNavigate(destinationId);
  }

  useEffect(() => {
    if (!isOpen) return undefined;
    firstItemRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeMenu();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(false);
  }, [activeDestination]);

  if (hidden) return null;

  return (
    <div className={`global-navigation${isOpen ? ' global-navigation-open' : ''}`}>
      {isOpen && (
        <button type="button" className="global-navigation-backdrop" aria-label="Close navigation"
          onClick={() => closeMenu()} />
      )}
      {isOpen && (
        <nav className="global-navigation-panel" id="global-navigation-panel" aria-label="Global navigation">
          <div className="global-navigation-heading">
            <div><span className="global-navigation-mark">🌿</span><strong>Plant Tracker</strong></div>
            <button type="button" className="global-navigation-close" aria-label="Close navigation"
              onClick={() => closeMenu()}>×</button>
          </div>
          <div className="global-navigation-list">
            {globalNavigationDestinations.map((item, index) => (
              <div key={item.id}>
                <button type="button" ref={index === 0 ? firstItemRef : undefined}
                  className={activeDestination === item.id ? 'active' : ''}
                  aria-current={activeDestination === item.id ? 'page' : undefined}
                  onClick={() => selectDestination(item.id)}>
                  <span className="global-navigation-icon" aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
                {item.id === 'add-plant' && contextualAction && (
                  <button type="button" className="global-navigation-context"
                    onClick={() => selectDestination(contextualAction.id)}>
                    <span className="global-navigation-icon" aria-hidden="true">{contextualAction.icon || '✎'}</span>
                    <span>{contextualAction.label}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </nav>
      )}
      <button type="button" className="global-navigation-trigger" ref={triggerRef}
        aria-label={isOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={isOpen} aria-controls="global-navigation-panel"
        onClick={() => isOpen ? closeMenu() : setIsOpen(true)}>
        <span aria-hidden="true">{isOpen ? '×' : '☰'}</span>
      </button>
    </div>
  );
}
