from cachetools import TTLCache

# 30-minute TTL; KOSPI full fetch takes 60-120s so we never repeat within a session
_cache: TTLCache = TTLCache(maxsize=256, ttl=1800)

def get_cache() -> TTLCache:
    return _cache
