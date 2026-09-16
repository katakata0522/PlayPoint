'use strict';

const OWNED_LOCAL_STORAGE_RULES = Object.freeze({
    hokuhokuDiaryData: Object.freeze({
        recoveryKey: 'hokuhokuDiaryDataRecoveryV1',
        validate: validateDiaryStore
    }),
    playpointLastMainCalculationV1: Object.freeze({
        recoveryKey: 'playpointLastMainCalculationRecoveryV1',
        validate: validateLastMainCalculationStore
    })
});

const INSTALL_MARKER = Symbol.for('playpoint.storageSafety.v1');

function isPlainRecord(value) {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function normalizeStoredPoints(value) {
    if (value === null || value === undefined || String(value).trim() === '') return '';
    const raw = String(value).trim();
    if (!/^\d+$/.test(raw)) return null;
    const points = Number(raw);
    return Number.isSafeInteger(points) && points >= 0 ? String(points) : null;
}

export function validateDiaryStore(value) {
    if (!isPlainRecord(value)) return false;
    for (const [yearKey, monthData] of Object.entries(value)) {
        const year = Number(yearKey);
        if (!Number.isInteger(year) || year < 2020 || year > 2100 || !isPlainRecord(monthData)) return false;
        for (const [monthKey, weekData] of Object.entries(monthData)) {
            const month = Number(monthKey);
            if (!Number.isInteger(month) || month < 1 || month > 12 || !isPlainRecord(weekData)) return false;
            for (const [weekKey, entry] of Object.entries(weekData)) {
                const week = Number(weekKey);
                if (!Number.isInteger(week) || week < 1 || week > 5 || !isPlainRecord(entry)) return false;
                if (normalizeStoredPoints(entry.points) === null) return false;
                if (entry.prize !== undefined && entry.prize !== null && typeof entry.prize !== 'string') return false;
            }
        }
    }
    return true;
}

function normalizeLastCalculation(value) {
    const points = Number(value?.neededPoints);
    if (!isPlainRecord(value)
        || typeof value.region !== 'string'
        || typeof value.currentStatus !== 'string'
        || typeof value.targetStatus !== 'string'
        || !Number.isSafeInteger(points)
        || points < 0) return null;
    return {
        region: value.region,
        currentStatus: value.currentStatus,
        targetStatus: value.targetStatus,
        neededPoints: String(points)
    };
}

export function validateLastMainCalculationStore(value) {
    if (!isPlainRecord(value) || value.version !== 1 || !isPlainRecord(value.mainByRegion)) return false;
    return Object.entries(value.mainByRegion).every(([region, snapshot]) => {
        const normalized = normalizeLastCalculation(snapshot);
        return Boolean(normalized && normalized.region === region);
    });
}

export function classifyOwnedStorageValue(key, rawValue) {
    if (rawValue === null) return Object.freeze({ state: 'empty', parsed: null });
    let parsed;
    try {
        parsed = JSON.parse(String(rawValue));
    } catch {
        return Object.freeze({ state: 'malformed-json', parsed: null });
    }

    if (key === 'playpointLastMainCalculationV1'
        && isPlainRecord(parsed)
        && Number.isInteger(parsed.version)
        && parsed.version > 1) {
        return Object.freeze({ state: 'future-version', parsed });
    }

    const rule = OWNED_LOCAL_STORAGE_RULES[key];
    if (!rule || !rule.validate(parsed)) {
        return Object.freeze({ state: 'invalid-schema', parsed });
    }
    return Object.freeze({ state: 'valid', parsed });
}

function makeRecoveryEnvelope(sourceKey, state, raw, now) {
    return JSON.stringify({
        version: 1,
        sourceKey,
        reason: state,
        capturedAt: now(),
        raw
    });
}

function preserveUnreadableRaw(storage, originalSetItem, sourceKey, rule, classification, raw, now) {
    const existingRecovery = storage.getItem(rule.recoveryKey);
    if (existingRecovery === null) {
        originalSetItem.call(
            storage,
            rule.recoveryKey,
            makeRecoveryEnvelope(sourceKey, classification.state, raw, now)
        );
        return;
    }

    try {
        const parsed = JSON.parse(existingRecovery);
        if (parsed?.sourceKey === sourceKey && parsed?.raw === raw) return;
    } catch {
        // A malformed recovery slot is still user data. Do not replace it automatically.
    }
    throw new Error(`PlayPoint refused to overwrite ${sourceKey}: a different recovery copy already exists.`);
}

export function installOwnedStorageSafety(target = globalThis, now = () => new Date().toISOString()) {
    let StorageCtor;
    let localStorage;
    try {
        StorageCtor = target?.Storage;
        localStorage = target?.localStorage;
    } catch {
        return false;
    }
    if (!StorageCtor?.prototype || !localStorage) return false;

    const prototype = StorageCtor.prototype;
    if (prototype[INSTALL_MARKER]) return true;

    const originalSetItem = prototype.setItem;
    if (typeof originalSetItem !== 'function') return false;

    try {
        Object.defineProperty(prototype, INSTALL_MARKER, {
            configurable: false,
            enumerable: false,
            writable: false,
            value: originalSetItem
        });

        prototype.setItem = function guardedSetItem(key, value) {
            const normalizedKey = String(key);
            const rule = OWNED_LOCAL_STORAGE_RULES[normalizedKey];
            if (this !== localStorage || !rule) {
                return originalSetItem.call(this, normalizedKey, value);
            }

            const nextRaw = String(value);
            const nextClassification = classifyOwnedStorageValue(normalizedKey, nextRaw);
            if (nextClassification.state !== 'valid') {
                throw new TypeError(`PlayPoint refused to write invalid data to ${normalizedKey}.`);
            }

            const previousRaw = this.getItem(normalizedKey);
            const previousClassification = classifyOwnedStorageValue(normalizedKey, previousRaw);
            if (!['empty', 'valid'].includes(previousClassification.state)) {
                preserveUnreadableRaw(
                    this,
                    originalSetItem,
                    normalizedKey,
                    rule,
                    previousClassification,
                    previousRaw,
                    now
                );
                target.console?.warn?.(
                    `PlayPoint preserved unreadable ${normalizedKey} data in ${rule.recoveryKey} before replacement.`
                );
            }

            return originalSetItem.call(this, normalizedKey, nextRaw);
        };
    } catch {
        return false;
    }

    return true;
}

if (typeof window !== 'undefined') {
    installOwnedStorageSafety(window);
}

export { bindLanguageSuggestionDismiss, checkLanguageSuggestion, formatLastCalculationText, getLastMainCalculationForRegion, sameCalculationContext, saveLastMainCalculationForRegion } from './first-view.js';
