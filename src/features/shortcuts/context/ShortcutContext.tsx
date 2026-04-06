import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  SHORTCUT_CATEGORY_ORDER,
  getShortcutCategoryLabel,
  getShortcutDisplayKeys,
  type ShortcutDefinition,
  type ShortcutHelpSection,
  type ShortcutRegistration,
} from '@/shared/config/shortcuts';
import { ShortcutHelpModal } from '@/features/shortcuts/ui/ShortcutHelpModal';
import { useTranslation } from 'react-i18next';

type ShortcutContextValue = {
  registerShortcuts: (sourceId: string, registration: ShortcutRegistration) => void;
  unregisterShortcuts: (sourceId: string) => void;
  openHelp: () => void;
  closeHelp: () => void;
};

type ShortcutProviderProps = {
  children: ReactNode;
  currentPath: string;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  navigate: (path: string) => void;
};

type SequenceState = {
  firstStroke: string;
  timeoutId: number;
};

type LocalizedShortcutHelpSection = ShortcutHelpSection & {
  categoryLabel: string;
};

const ShortcutContext = createContext<ShortcutContextValue | undefined>(undefined);
const SEQUENCE_TIMEOUT_MS = 1400;

const normalizeKey = (event: KeyboardEvent) => {
  if (event.key === ' ') {
    return 'space';
  }

  return event.key.toLowerCase();
};

const isModifierOnly = (event: KeyboardEvent) =>
  ['control', 'shift', 'alt', 'meta'].includes(normalizeKey(event));

const isEditableElement = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tagName = target.tagName;
  return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
};

const matchesStroke = (bindingStroke: string, event: KeyboardEvent) => {
  const parts = bindingStroke.split('+');
  const required = new Set(parts);
  const normalizedKey = normalizeKey(event);

  const wantsMod = required.delete('mod');
  const wantsCtrl = required.delete('ctrl');
  const wantsMeta = required.delete('meta');
  const wantsShift = required.delete('shift');
  const wantsAlt = required.delete('alt');
  const keyPart = [...required][0];

  if (wantsMod) {
    if (!(event.ctrlKey || event.metaKey)) {
      return false;
    }
  } else {
    if (wantsCtrl !== event.ctrlKey) {
      return false;
    }

    if (wantsMeta !== event.metaKey) {
      return false;
    }
  }

  if (wantsShift !== event.shiftKey && keyPart !== '?') {
    return false;
  }

  if (wantsAlt !== event.altKey) {
    return false;
  }

  if (!keyPart) {
    return false;
  }

  return keyPart === normalizedKey;
};

const buildHelpSections = (
  shortcuts: ShortcutDefinition[],
  getCategoryLabel: (category: ShortcutDefinition['category']) => string,
) => {
  const grouped = shortcuts.reduce<Map<string, LocalizedShortcutHelpSection>>((map, shortcut) => {
    if (shortcut.visible === false) {
      return map;
    }

    const category = shortcut.category;
    const section = map.get(category) || {
      category,
      categoryLabel: getCategoryLabel(category),
      items: [],
    };

    section.items.push({
      id: shortcut.id,
      description: shortcut.description,
      keys: getShortcutDisplayKeys(shortcut),
    });
    map.set(category, section);
    return map;
  }, new Map());

  return SHORTCUT_CATEGORY_ORDER.map(category => grouped.get(category)).filter(
    (section): section is LocalizedShortcutHelpSection => Boolean(section),
  );
};

export const ShortcutProvider = ({
  children,
  currentPath,
  drawerOpen,
  setDrawerOpen,
  navigate,
}: ShortcutProviderProps) => {
  const { t } = useTranslation();
  const [registrations, setRegistrations] = useState<Record<string, ShortcutRegistration>>({});
  const [helpOpen, setHelpOpen] = useState(false);
  const sequenceStateRef = useRef<SequenceState | null>(null);
  const isComposingRef = useRef(false);

  const clearSequence = useCallback(() => {
    if (sequenceStateRef.current) {
      window.clearTimeout(sequenceStateRef.current.timeoutId);
      sequenceStateRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearSequence();
  }, [currentPath, clearSequence]);

  const registerShortcuts = useCallback((sourceId: string, registration: ShortcutRegistration) => {
    setRegistrations(current => ({
      ...current,
      [sourceId]: registration,
    }));
  }, []);

  const unregisterShortcuts = useCallback((sourceId: string) => {
    setRegistrations(current => {
      const next = { ...current };
      delete next[sourceId];
      return next;
    });
  }, []);

  const handleNavigate = useCallback(
    (path: string) => {
      clearSequence();
      setDrawerOpen(false);
      navigate(path);
      setHelpOpen(false);
    },
    [clearSequence, navigate, setDrawerOpen],
  );

  const globalShortcuts = useMemo<ShortcutDefinition[]>(
    () => [
      {
        id: 'shortcut-help',
        description: t('shortcuts.actions.openHelp'),
        category: 'ナビゲーション',
        bindings: ['?'],
        action: () => setHelpOpen(current => !current),
        allowInDialog: true,
      },
      {
        id: 'nav-todos',
        description: t('shortcuts.actions.navTodos'),
        category: 'ナビゲーション',
        bindings: ['g i'],
        action: () => handleNavigate('/'),
      },
      {
        id: 'nav-new',
        description: t('shortcuts.actions.navNew'),
        category: 'ナビゲーション',
        bindings: ['g n'],
        action: () => handleNavigate('/new'),
      },
      {
        id: 'nav-availability',
        description: t('shortcuts.actions.navAvailability'),
        category: 'ナビゲーション',
        bindings: ['g a'],
        action: () => handleNavigate('/availability'),
      },
      {
        id: 'nav-plan-actual',
        description: t('shortcuts.actions.navPlanActual'),
        category: 'ナビゲーション',
        bindings: ['g p'],
        action: () => handleNavigate('/plan-actual'),
      },
      {
        id: 'nav-notifications',
        description: t('shortcuts.actions.navNotifications'),
        category: 'ナビゲーション',
        bindings: ['g t'],
        action: () => handleNavigate('/settings/notifications'),
      },
      {
        id: 'nav-work-hours',
        description: t('shortcuts.actions.navWorkHours'),
        category: 'ナビゲーション',
        bindings: ['g w'],
        action: () => handleNavigate('/settings/work-hours'),
      },
      {
        id: 'nav-usage',
        description: t('shortcuts.actions.navUsage'),
        category: 'ナビゲーション',
        bindings: ['g u'],
        action: () => handleNavigate('/help/usage'),
      },
      {
        id: 'nav-about',
        description: t('shortcuts.actions.navAbout'),
        category: 'ナビゲーション',
        bindings: ['g b'],
        action: () => handleNavigate('/help/about'),
      },
      {
        id: 'close-global-overlay',
        description: t('shortcuts.actions.closeOverlay'),
        category: 'ダイアログ',
        bindings: ['escape'],
        action: () => {
          if (helpOpen) {
            setHelpOpen(false);
            return;
          }

          if (drawerOpen) {
            setDrawerOpen(false);
          }
        },
        enabled: helpOpen || drawerOpen,
        visible: false,
        allowInDialog: true,
        allowInInput: true,
      },
    ],
    [drawerOpen, handleNavigate, helpOpen, setDrawerOpen, t],
  );

  const pageEntries = useMemo(() => Object.values(registrations), [registrations]);
  const overlayOpen = pageEntries.some(entry => entry.overlayOpen);
  const pageShortcuts = useMemo(() => pageEntries.flatMap(entry => entry.shortcuts), [pageEntries]);
  const pageLabel = useMemo(
    () =>
      pageEntries
        .map(entry => entry.pageLabel)
        .filter(Boolean)
        .at(-1),
    [pageEntries],
  );
  const getCategoryLabel = useCallback(
    (category: ShortcutDefinition['category']) => getShortcutCategoryLabel(category, t),
    [t],
  );
  const globalHelpSections = useMemo(
    () => buildHelpSections(globalShortcuts, getCategoryLabel),
    [getCategoryLabel, globalShortcuts],
  );
  const pageHelpSections = useMemo(
    () => buildHelpSections(pageShortcuts, getCategoryLabel),
    [getCategoryLabel, pageShortcuts],
  );

  useEffect(() => {
    const handleCompositionStart = () => {
      isComposingRef.current = true;
    };

    const handleCompositionEnd = () => {
      isComposingRef.current = false;
    };

    const runShortcut = (shortcut: ShortcutDefinition) => {
      clearSequence();
      shortcut.action();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isModifierOnly(event) || event.repeat) {
        return;
      }

      if (event.isComposing || isComposingRef.current || event.keyCode === 229) {
        return;
      }

      const editable = isEditableElement(event.target);
      const availableShortcuts = [...pageShortcuts, ...globalShortcuts].filter(shortcut => {
        if (shortcut.enabled === false) {
          return false;
        }

        if (editable && !shortcut.allowInInput) {
          return false;
        }

        if ((overlayOpen || drawerOpen) && !shortcut.allowInDialog) {
          return false;
        }

        return true;
      });

      if (helpOpen) {
        if (matchesStroke('escape', event)) {
          event.preventDefault();
          clearSequence();
          setHelpOpen(false);
          return;
        }

        const helpShortcut = availableShortcuts.find(shortcut => shortcut.id === 'shortcut-help');
        if (helpShortcut && helpShortcut.bindings.some(binding => matchesStroke(binding, event))) {
          event.preventDefault();
          runShortcut(helpShortcut);
        }
        return;
      }

      const sequenceState = sequenceStateRef.current;
      if (sequenceState) {
        const sequenceMatch = availableShortcuts.find(shortcut =>
          shortcut.bindings.some(binding => {
            const strokes = binding.split(' ');
            return (
              strokes.length === 2 &&
              strokes[0] === sequenceState.firstStroke &&
              matchesStroke(strokes[1], event)
            );
          }),
        );

        if (sequenceMatch) {
          event.preventDefault();
          runShortcut(sequenceMatch);
          return;
        }

        clearSequence();
      }

      const singleMatch = availableShortcuts.find(shortcut =>
        shortcut.bindings.some(binding => {
          const strokes = binding.split(' ');
          return strokes.length === 1 && matchesStroke(strokes[0], event);
        }),
      );

      if (singleMatch) {
        event.preventDefault();
        runShortcut(singleMatch);
        return;
      }

      const sequenceStart = availableShortcuts.find(shortcut =>
        shortcut.bindings.some(binding => {
          const strokes = binding.split(' ');
          return strokes.length === 2 && matchesStroke(strokes[0], event);
        }),
      );

      if (sequenceStart) {
        const firstStroke = sequenceStart.bindings
          .map(binding => binding.split(' '))
          .find(strokes => strokes.length === 2 && matchesStroke(strokes[0], event))?.[0];

        if (firstStroke) {
          event.preventDefault();
          clearSequence();
          sequenceStateRef.current = {
            firstStroke,
            timeoutId: window.setTimeout(() => {
              sequenceStateRef.current = null;
            }, SEQUENCE_TIMEOUT_MS),
          };
        }
      }
    };

    window.addEventListener('compositionstart', handleCompositionStart);
    window.addEventListener('compositionend', handleCompositionEnd);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearSequence();
      window.removeEventListener('compositionstart', handleCompositionStart);
      window.removeEventListener('compositionend', handleCompositionEnd);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [clearSequence, drawerOpen, globalShortcuts, helpOpen, overlayOpen, pageShortcuts]);

  const contextValue = useMemo<ShortcutContextValue>(
    () => ({
      registerShortcuts,
      unregisterShortcuts,
      openHelp: () => setHelpOpen(true),
      closeHelp: () => setHelpOpen(false),
    }),
    [registerShortcuts, unregisterShortcuts],
  );

  return (
    <ShortcutContext.Provider value={contextValue}>
      {children}
      <ShortcutHelpModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        pageLabel={pageLabel}
        globalSections={globalHelpSections}
        pageSections={pageHelpSections}
      />
    </ShortcutContext.Provider>
  );
};

/* eslint-disable-next-line react-refresh/only-export-components */
export const useRegisterShortcuts = (registration: ShortcutRegistration) => {
  const context = useContext(ShortcutContext);
  const sourceId = useId();

  if (!context) {
    throw new Error('useRegisterShortcuts must be used within a ShortcutProvider');
  }

  useEffect(() => {
    context.registerShortcuts(sourceId, registration);
    return () => context.unregisterShortcuts(sourceId);
  }, [context, registration, sourceId]);
};

/* eslint-disable-next-line react-refresh/only-export-components */
export const useShortcutHelp = () => {
  const context = useContext(ShortcutContext);

  if (!context) {
    throw new Error('useShortcutHelp must be used within a ShortcutProvider');
  }

  return {
    openHelp: context.openHelp,
    closeHelp: context.closeHelp,
  };
};
