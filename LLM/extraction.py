import json
import os
import re
from langchain_core.prompts import PromptTemplate
from langchain_huggingface import HuggingFaceEndpoint, ChatHuggingFace

HF_TOKEN = os.getenv("HF_TOKEN")
base_llm = HuggingFaceEndpoint(
    repo_id="openai/gpt-oss-120b",
    huggingfacehub_api_token=HF_TOKEN,
    temperature=0.1,
    max_new_tokens=500
)

llm = ChatHuggingFace(
    llm=base_llm
)

prompt = PromptTemplate.from_template("""You are a helpful assistant for extracting structured medicine data from OCR text.

Return ONLY JSON and dont add any extra text.  date format dd-mm-yyyy amount should be number not string:

{{
  "brand_name": "",
  "generic_name": "",
  "dosage_form": "",
  "manufacturer": "",
  "stock_qty": "",
  "expiry_date": "",
  "price": ""
}}

If not medicine:
{{"invalid": true}}

OCR TEXT:
{ocr_text}
""")



def extract_medicine_data(text):
    try:
        chain = prompt | llm

        response = chain.invoke({
            "ocr_text": text
        })

        output = response.content

        print("LLM RAW OUTPUT:", output)
        output = re.sub(r"```json|```", "", output).strip()

        print("LLM CLEANED OUTPUT:", output)

        data = json.loads(output)
        print("PARSED DATA:", data)

        if data.get("invalid"):
            return {"success": False, "invalid": True}

        return {
            "success": True,
            "invalid": False,
            "data": data
        }

    except Exception as e:
        return {
            "success": False,
            "invalid": True,
            "error": str(e)
        }