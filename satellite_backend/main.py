from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
# pyrefly: ignore [missing-import]
import ee
import os
import datetime
# pyrefly: ignore [missing-import]
from google.oauth2.service_account import Credentials

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Service account file from the backend folder
SERVICE_ACCOUNT_FILE = r'C:\Users\Taulant Aliu\Desktop\Verdara 2\backend\verdara-496318-300632bfe035.json'

# Initialize Earth Engine
def init_ee():
    try:
        credentials = Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE, 
            scopes=['https://www.googleapis.com/auth/earthengine', 'https://www.googleapis.com/auth/cloud-platform']
        )
        # Assuming the EE project name is embedded or Verdara project
        # In many cases you just pass credentials to ee.Initialize
        ee.Initialize(credentials, project='verdara-496318')
        print("Earth Engine initialized successfully.")
    except Exception as e:
        print(f"Failed to initialize Earth Engine: {e}")

init_ee()

class PolygonRequest(BaseModel):
    coordinates: list

@app.post("/analyze-satellite")
async def analyze_satellite(request: PolygonRequest):
    try:
        if not request.coordinates or len(request.coordinates) < 3:
            raise HTTPException(status_code=400, detail="Invalid coordinates provided")
            
        # Create an EE geometry from the coordinates
        roi = ee.Geometry.Polygon([request.coordinates])
        
        # Load Sentinel-2 surface reflectance for the last 6 months
        end_date = datetime.date.today()
        start_date = end_date - datetime.timedelta(days=180)
        
        image = (ee.ImageCollection('COPERNICUS/S2_SR')
            .filterBounds(roi)
            .filterDate(start_date.strftime('%Y-%m-%d'), end_date.strftime('%Y-%m-%d'))
            .sort('CLOUDY_PIXEL_PERCENTAGE')
            .first())
            
        if not image:
            raise HTTPException(status_code=404, detail="No imagery found for this region in the last 6 months")

        # Calculate NDVI: (B8 - B4) / (B8 + B4)
        ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI')
        
        # Clip to the drawn polygon
        ndvi_clipped = ndvi.clip(roi)
        
        # Define viz params (Red -> Yellow -> Green)
        ndvi_viz = {
            'min': 0.0,
            'max': 0.8,
            'palette': ['red', 'yellow', 'green']
        }
        
        # Get Map ID
        map_id_dict = ee.Image(ndvi_clipped).getMapId(ndvi_viz)
        tile_url = map_id_dict['tile_fetcher'].url_format
        
        return {"tile_url": tile_url}
        
    except Exception as e:
        print(f"Error analyzing satellite data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
