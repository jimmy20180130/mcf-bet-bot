const fs = require('fs');
const path = require('path');

const localeCache = new Map();
const FALLBACK_LOCALE = 'zh_TW';

function normalizeLocaleTag(locale) {
    if (!locale) return FALLBACK_LOCALE;
    return String(locale).replace('-', '_');
}

function loadLocale(locale) {
    const normalized = normalizeLocaleTag(locale);
    if (localeCache.has(normalized)) {
        return localeCache.get(normalized);
    }

    const localePath = path.join(process.cwd(), 'locales', `${normalized}.json`);
    let data = {};

    try {
        if (fs.existsSync(localePath)) {
            data = JSON.parse(fs.readFileSync(localePath, 'utf-8'));
        }
    } catch {
        data = {};
    }

    localeCache.set(normalized, data);
    return data;
}

function getByPath(obj, key) {
    return String(key)
        .split('.')
        .reduce((acc, current) => (acc && acc[current] !== undefined ? acc[current] : undefined), obj);
}

function interpolate(template, vars = {}) {
    return String(template).replace(/\{(\w+)\}/g, (_, key) => {
        const value = vars[key];
        return value === undefined || value === null ? `{${key}}` : String(value);
    });
}

function t(key, vars = {}, locale = FALLBACK_LOCALE) {
    const data = loadLocale(locale);
    let template = getByPath(data, key);

    if (template === undefined && normalizeLocaleTag(locale) !== FALLBACK_LOCALE) {
        template = getByPath(loadLocale(FALLBACK_LOCALE), key);
    }

    if (template === undefined) {
        return String(key);
    }

    return interpolate(template, vars);
}

function tForInteraction(interaction, key, vars = {}) {
    const locale = interaction?.locale || FALLBACK_LOCALE;
    return t(key, vars, locale);
}

module.exports = {
    t,
    tForInteraction
};
