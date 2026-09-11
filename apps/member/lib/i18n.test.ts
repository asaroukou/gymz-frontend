import { describe, expect, it } from 'vitest';
import fr from '../messages/fr.json';
import en from '../messages/en.json';
import { flattenKeys, t } from './i18n';

describe('i18n message parity', () => {
  it('fr and en have the exact same key set', () => {
    const frKeys = flattenKeys(fr).sort();
    const enKeys = flattenKeys(en).sort();
    expect(frKeys).toEqual(enKeys);
  });
});

describe('t', () => {
  it('resolves a nested key in the default (fr) locale', () => {
    expect(t('login.title')).toBe('Connexion');
  });
  it('interpolates params', () => {
    expect(t('card.greeting', { name: 'Awa' })).toBe('Bonjour Awa');
  });
  it('pluralizes entriesRemaining based on count', () => {
    expect(t('card.entriesRemaining', { count: 1 })).toBe('1 entrée restante');
    expect(t('card.entriesRemaining', { count: 2 })).toBe('2 entrées restantes');
  });
});
