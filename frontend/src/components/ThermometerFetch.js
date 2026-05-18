import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { Thermometer } from "./Thermometer";

/**
 * ThermometerFetch — data wrapper around <Thermometer />.
 *
 * Hits  GET /api/temperature/{kind}/{value}?range={range}
 * with a small in-memory cache (60s TTL) shared across the app so that
 * lists with dozens of items don't fan out into dozens of requests.
 *
 * Props mirror Thermometer + { kind, value, range }.
 * If `initial` is provided (e.g. a temperature object that came from a
 * list endpoint) the chip renders immediately and skips the request.
 */

const CACHE = new Map(); // key -> { at: ms, data }
const INFLIGHT = new Map(); // key -> Promise
const TTL_MS = 60_000;

function cacheKey(kind, value, range) {
    return `${kind}::${(value || "").toString().toLowerCase()}::${range}`;
}

function getCached(key) {
    const hit = CACHE.get(key);
    if (!hit) return null;
    if (Date.now() - hit.at > TTL_MS) {
        CACHE.delete(key);
        return null;
    }
    return hit.data;
}

async function fetchTemperature(kind, value, range) {
    const key = cacheKey(kind, value, range);
    const cached = getCached(key);
    if (cached) return cached;
    if (INFLIGHT.has(key)) return INFLIGHT.get(key);
    const p = api
        .get(`/temperature/${encodeURIComponent(kind)}/${encodeURIComponent(value)}?range=${encodeURIComponent(range)}`)
        .then((r) => {
            CACHE.set(key, { at: Date.now(), data: r.data });
            INFLIGHT.delete(key);
            return r.data;
        })
        .catch((e) => {
            INFLIGHT.delete(key);
            throw e;
        });
    INFLIGHT.set(key, p);
    return p;
}

export function ThermometerFetch({
    kind,
    value,
    range = "24h",
    initial = null,
    enabled = true,
    fallback = null,
    ...rest
}) {
    const [temp, setTemp] = useState(initial);
    const lastKey = useRef(null);

    useEffect(() => {
        if (!enabled || !kind || !value) return;
        const key = cacheKey(kind, value, range);
        // If we already have an `initial` payload that matches the key, use it.
        if (initial && lastKey.current === null) {
            lastKey.current = key;
            return;
        }
        if (lastKey.current === key && temp) return;
        let cancelled = false;
        lastKey.current = key;
        fetchTemperature(kind, value, range)
            .then((data) => {
                if (!cancelled) setTemp(data);
            })
            .catch(() => {
                /* silent: temperature is a non-critical UI surface */
            });
        return () => {
            cancelled = true;
        };
    }, [kind, value, range, enabled, initial, temp]);

    if (!temp) return fallback;
    return <Thermometer temperature={temp} {...rest} />;
}

export default ThermometerFetch;
