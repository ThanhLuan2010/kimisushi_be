const TIMEZONE = 'Europe/Berlin';

function getLocalDateStr(d) {
    const date = d || new Date();
    return date.toLocaleDateString('en-CA', { timeZone: TIMEZONE });
}

function getLocalMinutes(d) {
    const date = d || new Date();
    return date.getHours() * 60 + date.getMinutes();
}

function getTomorrowStr(d) {
    const date = d || new Date();
    const tomorrow = new Date(date);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return getLocalDateStr(tomorrow);
}

function getDayName(d) {
    const date = d || new Date();
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    return dayNames[date.getDay()];
}

function getNextDayName(d) {
    const date = d || new Date();
    const tomorrow = new Date(date);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return getDayName(tomorrow);
}

function parseHours(str) {
    if (!str || !str.includes('-')) return null;
    const parts = str.split('-').map(s => s.trim());
    const startParts = parts[0].split(':');
    const endParts = parts[1].split(':');
    return {
        start: parseInt(startParts[0]) * 60 + parseInt(startParts[1]),
        end: parseInt(endParts[0]) * 60 + parseInt(endParts[1])
    };
}

function isStoreOpenNow(settings, d) {
    const date = d || new Date();
    const dayName = getDayName(date);
    const dayNameCap = dayName.charAt(0).toUpperCase() + dayName.slice(1);

    const slots = [
        parseHours(settings['hours' + dayNameCap + '1']),
        parseHours(settings['hours' + dayNameCap + '2'])
    ].filter(Boolean);

    if (slots.length === 0) return false;

    const nowMin = getLocalMinutes(date);
    return slots.some(s => nowMin >= s.start && nowMin < s.end - 20);
}

function getLastClosingTimeToday(settings, d) {
    const date = d || new Date();
    const dayName = getDayName(date);
    const dayNameCap = dayName.charAt(0).toUpperCase() + dayName.slice(1);

    const slots = [
        parseHours(settings['hours' + dayNameCap + '1']),
        parseHours(settings['hours' + dayNameCap + '2'])
    ].filter(Boolean);

    if (slots.length === 0) return null;
    return Math.max(...slots.map(s => s.end));
}

function getDefaultPickupDate(settings, d) {
    const date = d || new Date();
    const openNow = isStoreOpenNow(settings, date);
    const todayStr = getLocalDateStr(date);
    const tomorrowStr = getTomorrowStr(date);

    if (openNow) {
        return { date: todayStr, reason: 'store_open_now' };
    }
    return { date: tomorrowStr, reason: 'store_closed_now' };
}

function getEarliestSlot(settings, dateStr, currentMinutes) {
    const now = new Date();
    const todayStr = getLocalDateStr(now);
    const tomorrowStr = getTomorrowStr(now);

    const isToday = dateStr === todayStr;
    const isTomorrow = dateStr === tomorrowStr;

    if (isToday) {
        const dayName = getDayName(now);
        const dayNameCap = dayName.charAt(0).toUpperCase() + dayName.slice(1);
        const slots = [
            parseHours(settings['hours' + dayNameCap + '1']),
            parseHours(settings['hours' + dayNameCap + '2'])
        ].filter(Boolean);

        if (slots.length === 0) return null;

        const allSlots = [...slots].sort((a, b) => a.start - b.start);
        let earliest = allSlots[0].start;
        if (currentMinutes >= earliest) {
            earliest = Math.ceil((currentMinutes + 30) / 30) * 30;
        }
        return { hours: Math.floor(earliest / 60), minutes: earliest % 60 };
    }

    if (isTomorrow) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const nextDayName = getDayName(tomorrow);
        const nextDayNameCap = nextDayName.charAt(0).toUpperCase() + nextDayName.slice(1);
        const slots = [
            parseHours(settings['hours' + nextDayNameCap + '1']),
            parseHours(settings['hours' + nextDayNameCap + '2'])
        ].filter(Boolean);

        if (slots.length === 0) return null;
        const earliest = Math.min(...slots.map(s => s.start));
        return { hours: Math.floor(earliest / 60), minutes: earliest % 60 };
    }

    return null;
}

function resolveAsapPickup(settings, d) {
    const date = d || new Date();
    const nowMin = getLocalMinutes(date);
    const openNow = isStoreOpenNow(settings, date);
    const todayStr = getLocalDateStr(date);
    const tomorrowStr = getTomorrowStr(date);

    const dayName = getDayName(date);
    const dayNameCap = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    const slots = [
        parseHours(settings['hours' + dayNameCap + '1']),
        parseHours(settings['hours' + dayNameCap + '2'])
    ].filter(Boolean);

    if (openNow && slots.length > 0) {
        const allSlots = [...slots].sort((a, b) => a.start - b.start);
        let earliest = allSlots[0].start;
        if (nowMin >= earliest) {
            earliest = Math.ceil((nowMin + 30) / 30) * 30;
        }
        const nextHh = String(Math.floor(earliest / 60)).padStart(2, '0');
        const nextMm = String(earliest % 60).padStart(2, '0');
        return {
            pickupDate: todayStr,
            pickupTime: `${nextHh}:${nextMm}`,
            pickupTimeDisplay: `Schnellstmöglich (ca. ${nextHh}:${nextMm} Uhr)`,
            reason: 'open_today'
        };
    }

    const tomorrow = new Date(date);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextDayName = getDayName(tomorrow);
    const nextDayNameCap = nextDayName.charAt(0).toUpperCase() + nextDayName.slice(1);
    const nextSlots = [
        parseHours(settings['hours' + nextDayNameCap + '1']),
        parseHours(settings['hours' + nextDayNameCap + '2'])
    ].filter(Boolean);

    if (nextSlots.length === 0) {
        return {
            pickupDate: tomorrowStr,
            pickupTime: '11:00',
            pickupTimeDisplay: `${tomorrow.toLocaleDateString('de-DE')} um 11:00 Uhr`,
            reason: 'closed_tomorrow_no_hours'
        };
    }

    const earliest = Math.min(...nextSlots.map(s => s.start));
    const nextHh = String(Math.floor(earliest / 60)).padStart(2, '0');
    const nextMm = String(earliest % 60).padStart(2, '0');
    return {
        pickupDate: tomorrowStr,
        pickupTime: `${nextHh}:${nextMm}`,
        pickupTimeDisplay: `${tomorrow.toLocaleDateString('de-DE')} um ${nextHh}:${nextMm} Uhr`,
        reason: 'closed_today_next_open_tomorrow'
    };
}

module.exports = {
    TIMEZONE,
    getLocalDateStr,
    getLocalMinutes,
    getTomorrowStr,
    getDayName,
    getNextDayName,
    parseHours,
    isStoreOpenNow,
    getLastClosingTimeToday,
    getDefaultPickupDate,
    getEarliestSlot,
    resolveAsapPickup
};
