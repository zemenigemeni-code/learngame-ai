import pdfplumber
import json
import os
from pathlib import Path
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from groq import Groq
from learning_engine import LearningEngine

app = FastAPI()

# Разрешаем запросы от фронтенда
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ПРАВИЛЬНЫЙ ПУТЬ К FRONTEND
BASE_DIR = Path(__file__).parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

print(f"📁 Ищем frontend по пути: {FRONTEND_DIR}")
print(f"📁 Папка существует: {FRONTEND_DIR.exists()}")

app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

# Инициализируем клиент Groq
client = Groq(api_key="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")


def extract_text_from_pdf(pdf_path: str) -> str:
    """Извлекает текст из PDF файла."""
    text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text[:10000]


def analyze_text_with_ai(text: str) -> dict:
    """Отправляет текст в ИИ и получает структурированный JSON."""

    prompt = f"""
    Ты — образовательный ассистент, который превращает учебные материалы в структурированные данные для игры.
    
    ИЗВЛЕКИ из следующего текста следующие сущности:
    
    1. **Персонажи** (characters) — кто упоминается? Для каждого укажи:
       - name (имя)
       - role (роль: герой, бог, учитель и т.д.)
       - description (краткое описание, 1-2 предложения)
    
    2. **Локации** (locations) — места событий:
       - name (название)
       - description (описание)
    
    3. **События** (events) — ключевые происшествия:
       - name (название события)
       - description (что произошло)
       - participants (кто участвовал, список имен)
    
    4. **Важные объекты** (objects) — артефакты, предметы:
       - name (название)
       - purpose (назначение)
    
    ВЕРНИ ТОЛЬКО ЧИСТЫЙ JSON БЕЗ ЛЮБЫХ ПОЯСНЕНИЙ, КОММЕНТАРИЙ ИЛИ ФОРМАТИРОВАНИЯ.
    Формат:
    {{
      "characters": [...],
      "locations": [...],
      "events": [...],
      "objects": [...]
    }}
    
    Текст для анализа:
    {text[:8000]}
    """

    try:
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            temperature=0.3,
            max_tokens=3000,
        )

        response = chat_completion.choices[0].message.content

        # Ищем JSON в ответе
        start = response.find("{")
        end = response.rfind("}") + 1
        json_str = response[start:end]

        return json.loads(json_str)

    except Exception as e:
        return {"error": str(e)}


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Эндпоинт для загрузки PDF."""

    try:
        # Сохраняем файл
        file_path = f"materials/{file.filename}"
        os.makedirs("materials", exist_ok=True)

        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)

        # Извлекаем текст
        print("📄 Извлекаю текст из PDF...")
        text = extract_text_from_pdf(file_path)

        if not text or len(text) < 10:
            return {"error": "Не удалось извлечь текст из PDF"}

        # Анализируем через ИИ
        print("🤖 Анализирую текст через ИИ...")
        structured_data = analyze_text_with_ai(text)

        if "error" in structured_data:
            return {"error": f"Ошибка ИИ: {structured_data['error']}"}

        # Создаём движок и анализируем структуру
        print("🔍 Анализирую структуру контента...")
        engine = LearningEngine(structured_data, text, client)
        content_analysis = engine.analyze_content_structure()

        print(f"📊 Результат анализа: {content_analysis}")

        # Создаём обучающие материалы
        print("🎮 Создаю обучающие материалы...")
        all_materials = engine.create_all_materials()

        return {
            "filename": file.filename,
            "text_preview": text[:500] + "...",
            "structured_data": structured_data,
            "content_analysis": content_analysis,
            "all_materials": all_materials,
            "status": "success",
        }

    except Exception as e:
        return {"error": f"Ошибка сервера: {str(e)}", "status": "error"}


@app.get("/")
@app.get("/")
async def main():
    """Главная страница с фронтендом."""
    from pathlib import Path
    
    # Правильный путь к index.html
    BASE_DIR = Path(__file__).parent.parent
    index_path = BASE_DIR / "frontend" / "index.html"
    
    print(f"📁 Ищу index.html по пути: {index_path}")
    print(f"📁 Файл существует: {index_path.exists()}")
    
    if not index_path.exists():
        return HTMLResponse(
            "<h1>Ошибка</h1><p>Файл index.html не найден.</p>"
            f"<p>Путь: {index_path}</p>"
        )
    
    try:
        with open(index_path, "r", encoding="utf-8") as f:
            html_content = f.read()
        return HTMLResponse(html_content)
    except Exception as e:
        return HTMLResponse(f"<h1>Ошибка чтения файла</h1><pre>{e}</pre>")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
