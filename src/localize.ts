import { isCallable, merge, interpolate } from './utils';
import { ValidationMessageTemplate } from './types';
import { extend, RuleContainer } from './extend';

interface PartialI18nDictionary {
  name?: string;
  messages?: { [k: string]: ValidationMessageTemplate };
  names?: { [k: string]: string };
  fields?: { [k: string]: { [r: string]: ValidationMessageTemplate } };
}

interface RootI18nDictionary {
  [k: string]: PartialI18nDictionary;
}

class Dictionary {
  locale: string;
  private container: any;

  constructor(locale: string, dictionary: RootI18nDictionary) {
    this.container = {};
    this.locale = locale;
    this.merge(dictionary);
  }

  resolve(field: string, rule: string, values: { [k: string]: any }) {
    return this.format(this.locale, field, rule, values);
  }

  _hasLocale(locale: string) {
    return !!this.container[locale];
  }

  format(locale: string, field: string, rule: string, values: { [k: string]: any }) {
    let message!: ValidationMessageTemplate;

    // find if specific message for that field was specified.
    const dict = this.container[locale].fields && this.container[locale].fields[field];
    if (dict && dict[rule]) {
      message = dict[rule];
    }

    if (!message && this._hasLocale(locale) && this._hasMessage(locale, rule)) {
      message = this.container[locale].messages[rule];
    }

    if (this._hasName(locale, field)) {
      field = this.getName(locale, field);
    }

    return isCallable(message) ? message(field, values) : interpolate(message, { ...values, _field_: field });
  }

  merge(dictionary: RootI18nDictionary) {
    merge(this.container, dictionary);
  }

  getName(locale: string, key: string) {
    return this.container[locale].names[key];
  }

  _hasMessage(locale: string, key: string): boolean {
    return !!(this._hasLocale(locale) && this.container[locale].messages && this.container[locale].messages[key]);
  }

  _hasName(locale: string, key: string): boolean {
    return !!(this._hasLocale(locale) && this.container[locale].names && this.container[locale].names[key]);
  }
}

let DICTIONARY: Dictionary;
let INSTALLED = false;

function updateRules() {
  if (INSTALLED) {
    return;
  }

  RuleContainer.iterate(name => {
    extend(name, {
      message: (field: string, values?: { [k: string]: any }) => {
        return DICTIONARY.resolve(field, name, values || {});
      }
    });
  });

  INSTALLED = true;
}

function localize(dictionary: RootI18nDictionary): void;
function localize(locale: string, dictionary?: PartialI18nDictionary): void;

function localize(locale: string | RootI18nDictionary, dictionary?: PartialI18nDictionary) {
  if (!DICTIONARY) {
    DICTIONARY = new Dictionary('en', {});
  }

  if (typeof locale === 'string') {
    DICTIONARY.locale = locale;

    if (dictionary) {
      DICTIONARY.merge({ [locale]: dictionary });
    }

    updateRules();
    return;
  }

  DICTIONARY.merge(locale);
  updateRules();
}

export { localize };