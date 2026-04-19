from fastapi import FastAPI, File, Form, UploadFile, HTTPException, Depends, Response
from fastapi.responses import FileResponse
from pydantic import BaseModel
import io
from PIL import Image
from ultralytics import YOLO
import random
from pillow_heif import register_heif_opener
import base64
import io as io_module
from fastapi.middleware.cors import CORSMiddleware
from database import engine, SessionLocal
from models import Base, ImageRecord
from database import engine, SessionLocal
from models import Base, ImageRecord
import os
from datetime import datetime

register_heif_opener()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

UPLOAD_DIR = "/app/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

model = YOLO("yolov8n.pt")

class Detection(BaseModel):
    name: str
    conf: float
    box: list[int]  # [x1, y1, x2, y2]

class DetectionResult(BaseModel):
    choices: list[str]
    correct_answer: str
    crop_image: str
    result_image: str
    detections: list[Detection]

class ImageListResponse(BaseModel):
    id: int
    file_path: str
    created_at: datetime
    order: int | None

@app.post("/detect")
async def detect(file: UploadFile = File(...), confidence: float = Form(...)) -> DetectionResult:
    contents = await file.read()
    image = Image.open(io.BytesIO(contents))
    
    results = model(image, conf=confidence)

    boxes = results[0].boxes
                
    if len(boxes) == 0:
        raise HTTPException(status_code=422, detail="何も検出されませんでした")
    
    class_counts = {}
    detected_items = []
    names = results[0].names

    for box in boxes:
        cls_id = int(box.cls[0])
        conf = box.conf[0]
        name = names[cls_id]
        class_counts[name] = class_counts.get(name, 0) + 1
        detected_items.append(Detection(
            name=name,
            conf=float(conf),
            box=list(map(int, box.xyxy[0].cpu().numpy()))
        ))

    min_count = min(class_counts.values())
    rare_classes = [name for name, count in class_counts.items() if count == min_count]
    candidates = [item for item in detected_items if item.name in rare_classes]
    
    target = sorted(candidates, key=lambda x: x.conf)[0]

    x1, y1, x2, y2 = map(int, target.box)

    detected_names_unique = list(class_counts.keys())
    wrong_choices = [name for name in detected_names_unique if name != target.name]

    if len(wrong_choices) < 2:
        all_names = list(names.values())
        remaining_names = [n for n in all_names if n != target.name and n not in wrong_choices]
        sample_size = min(2, len(remaining_names))
        if sample_size > 0:
            wrong_choices += random.sample(remaining_names, sample_size)

    num_choices = min(2, len(wrong_choices))
    choices = [target.name] + random.sample(wrong_choices, num_choices)
    random.shuffle(choices)

    # 切り抜き画像をbase64に変換
    cropped = image.crop((x1, y1, x2, y2))
    buf = io.BytesIO()
    cropped.save(buf, format="PNG")
    crop_image = base64.b64encode(buf.getvalue()).decode("utf-8")

    # 答え合わせ画像をbase64に変換
    result_buf = io.BytesIO()
    result_pil = Image.fromarray(results[0].plot()[:, :, ::-1])
    result_pil.save(result_buf, format="PNG")
    result_image = base64.b64encode(result_buf.getvalue()).decode("utf-8")

    return DetectionResult(
        choices=choices,
        correct_answer=target.name,
        crop_image=crop_image,
        result_image=result_image,
        detections=detected_items
    )

@app.post("/images")
async def save_image(file: UploadFile = File(...), db = Depends(get_db)):
    contents = await file.read()
    
    file_path = f"{UPLOAD_DIR}/{file.filename}"
    with open(file_path, "wb") as f:
        f.write(contents)
    
    record = ImageRecord(file_path=file_path)
    db.add(record)
    db.commit()
    db.refresh(record)
    
    return {"id": record.id, "file_path": record.file_path}

@app.get("/images")
async def get_all_image(db = Depends(get_db)) -> list[ImageListResponse]:
    records = db.query(ImageRecord).all()
    return records

@app.get("/images/{id}/file")
async def get_image_file(id: int, db = Depends(get_db)):
    record = db.query(ImageRecord).filter(ImageRecord.id == id).first()
    if not record:
        raise HTTPException(status_code=404, detail="画像が見つかりません")
    return FileResponse(
        record.file_path,
        headers={"Access-Control-Allow-Origin": "http://localhost:3000"}
    )

@app.delete("/images/{id}")
async def delete_image(id: int, db = Depends(get_db)):
    record = db.query(ImageRecord).filter(ImageRecord.id == id).first()
    db.delete(record)
    db.commit()
    return record

@app.put("/images/{id}")
async def put_image(id: int, order: int, db = Depends(get_db)):
    record = db.query(ImageRecord).filter(ImageRecord.id == id).first()
    record.order = order
    db.commit()
    db.refresh(record)

    return record