from LLM.extraction import extract_medicine_data
from fastapi import FastAPI, Depends, HTTPException , Header
from sqlalchemy.orm import Session
from sqlalchemy import or_
from database import SessionLocal, engine
import models
from pydantic import BaseModel
from datetime import date
from fastapi.middleware.cors import CORSMiddleware
# import jwt
# from jwt import ExpiredSignatureError, InvalidTokenError
from datetime import datetime, timedelta

SECRET_KEY = "supersecretkey"  # 🔥 move to .env later
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60





import os, json
# from openai import OpenAI


# ------------------------
# Hashing Password
# ------------------------
import hashlib

def hash_password(password: str):
    return hashlib.sha256(password.encode()).hexdigest()

# ------------------------
# APP INIT
# ------------------------

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ⚠️ change in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------
# DB SETUP
# ------------------------

models.Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ------------------------
# OPENAI CLIENT
# ------------------------

# client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ------------------------
# SCHEMAS
# ------------------------


class FullMedicineCreate(BaseModel):
    brand_name: str
    generic_name: str
    dosage_form: str
    manufacturer: str = "Unknown"
    stock_qty: int
    expiry_date: date
    price: float
    user_id: int

# ------------------------
# HELPER: LEGAL CHECK
# ------------------------

def is_valid_medicine(name: str):
    # 🔥 Replace with real DB/API later
    allowed = ["paracetamol", "aspirin", "crocin"]
    return any(x in name.lower() for x in allowed)

# ------------------------
# OCR → LLM EXTRACTION
# ------------------------

class OCRRequest(BaseModel):
    text: str
@app.post("/extract-medicine")
def extract_medicine(req: OCRRequest):

    text = req.text.strip()

    if not text or len(text) < 5:
        return {
            "success": False,
            "invalid": True
        }

    return extract_medicine_data(text)

# ------------------------
# FINAL SUBMIT API
# ------------------------
# ------------------------
# USER SCHEMA
# ------------------------

class UserCreate(BaseModel):
    name: str
    email: str
    password: str


# ------------------------
# CREATE USER
# ------------------------

@app.post("/user")
def create_user(user: UserCreate, db: Session = Depends(get_db)):

    # Check if email already exists
    existing = db.query(models.User).filter(
        models.User.email == user.email
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    new_user = models.User(
        name=user.name,
        email=user.email,
        password=user.password  # ⚠️ hash later
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User created",
        "user_id": new_user.id
}

# ------------------------
# AUTH FUNCTION (ADD HERE ✅)
# ------------------------

def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing token")

    try:
        token = authorization.split(" ")[1]
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")



@app.post("/insert-full")
def insert_full(data: FullMedicineCreate, db: Session = Depends(get_db)):

    # -------- VALIDATION --------
    # if len(data.brand_name.strip()) < 3:
    #     raise HTTPException(400, "Invalid medicine name")

    # if data.stock_qty <= 0:
    #     raise HTTPException(400, "Stock must be > 0")

    # if data.price <= 0:
    #     raise HTTPException(400, "Price must be > 0")

    # if data.expiry_date <= date.today():
    #     raise HTTPException(400, "Medicine expired")

    # # -------- LEGAL CHECK --------
    # if not is_valid_medicine(data.brand_name):
    #     raise HTTPException(400, "Illegal medicine")

    # -------- CHECK EXISTING MEDICINE --------
    # existing = db.query(models.Medicine).filter(
    #     models.Medicine.brand_name.ilike(data.brand_name),
    #     models.Medicine.user_id == data.user_id
    # ).first()

    # if existing:
    #     med = existing
    # else:
    med = models.Medicine(
            brand_name=data.brand_name,
            generic_name=data.generic_name,
            dosage_form=data.dosage_form,
            manufacturer=data.manufacturer,
            user_id=data.user_id
        )
    db.add(med)
    db.commit()
    db.refresh(med)

    # -------- INSERT INVENTORY --------
    inv = models.Inventory(
        user_id=data.user_id,
        medicine_id=med.id,
        stock_qty=data.stock_qty,
        expiry_date=data.expiry_date,
        price=data.price
    )

    db.add(inv)
    db.commit()

    return {
        "status": "success",
        "medicine_id": med.id,
        "message": "Medicine added successfully"
    }


# ------------------------
# Create Token
# ------------------------

def create_access_token(data: dict):
    to_encode = data.copy()

    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# ------------------------
# Signup API
# ------------------------

@app.post("/signup")
def signup(user: UserCreate, db: Session = Depends(get_db)):

    #  Check if email already exists
    existing = db.query(models.User).filter(
        models.User.email == user.email
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    new_user = models.User(
        name=user.name,
        email=user.email,
        password = user.password
        # password=hash_password(user.password) $ if want hashing just use that 
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # token = create_access_token({
    #     "user_id": new_user.id,
    #     "email": new_user.email
    # })

    # console.log(new_user.id)

    return {
         "user_id": new_user.id,
        "message": "User created"
    }

# ------------------------
# Login API
# ------------------------
class LoginRequest(BaseModel):
    email: str
    password: str

@app.post("/login")
def login(user: LoginRequest, db: Session = Depends(get_db)):

    existing = db.query(models.User).filter(
        models.User.email == user.email,
        models.User.password == user.password
    ).first()

    if not existing:
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password"
        )

    return {
        "access_token": existing.id,   # ✅ correct
        "message": "Login successful"
    }
    



# ------------------------
# INVENTORY API (by user)
# ------------------------

@app.get("/inventory")
def get_inventory(user_id: int, db: Session = Depends(get_db)):
    medicines = db.query(models.Medicine).filter(
        models.Medicine.user_id == user_id
    ).all()

    result = []
    for med in medicines:
        for inv in med.inventory:
            days_left = (inv.expiry_date - date.today()).days
            result.append({
                "medicine_id":  med.id,
                "brand_name":   med.brand_name,
                "generic_name": med.generic_name,
                "dosage_form":  med.dosage_form,
                "manufacturer": med.manufacturer,
                "stock_qty":    inv.stock_qty,
                "expiry_date":  str(inv.expiry_date),
                "price":        inv.price,
                "days_left":    days_left,
                "inventory_id": inv.id,
            })

    return result

# ------------------------
# SEARCH API
# ------------------------

@app.get("/search")
def search_medicine(query: str, db: Session = Depends(get_db)):

    medicines = db.query(models.Medicine).filter(
        or_(
            models.Medicine.brand_name.ilike(f"%{query}%"),
            models.Medicine.generic_name.ilike(f"%{query}%")
        )
    ).all()

    result = []

    for med in medicines:
        for inv in med.inventory:

            if inv.stock_qty <= 0:
                continue

            days_left = (inv.expiry_date - date.today()).days
            if days_left < 0:
                continue

            result.append({
                "medicine_id": med.id,
                "brand_name": med.brand_name,
                "generic_name": med.generic_name,
                "stock": inv.stock_qty,
                "expiry_date": inv.expiry_date,
                "price": inv.price,
                "user_id": inv.user_id
            })

    return result