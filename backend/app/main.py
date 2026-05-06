import math
import json
import numpy as np
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.routers import races
from app.routers import drivers
from app.routers import championship
from app.routers import live
from app.routers.radio import router as radio_router



def _json_default(obj):
    if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
        return None
    if isinstance(obj, np.integer):
        return int(obj)
    if isinstance(obj, np.floating):
        v = float(obj)
        return None if (math.isnan(v) or math.isinf(v)) else v
    if isinstance(obj, np.bool_):
        return bool(obj)
    if isinstance(obj, np.ndarray):
        return obj.tolist()
    return str(obj)


class NaNSafeJSONResponse(JSONResponse):
    def render(self, content) -> bytes:
        import re as _re
        s = json.dumps(content, default=_json_default)
        s = _re.sub(r": NaN", ": null", s)
        s = _re.sub(r": Infinity", ": null", s)
        s = _re.sub(r": -Infinity", ": null", s)
        return s.encode("utf-8")


app = FastAPI(
    title="PitWall API",
    version="0.1.0",
    default_response_class=NaNSafeJSONResponse,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(races.router)
app.include_router(drivers.router)
app.include_router(championship.router)
app.include_router(live.router)
app.include_router(radio_router)




@app.get("/health")
async def health():
    return {"status": "ok", "service": "pitwall-api"}
