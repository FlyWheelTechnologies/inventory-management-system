import os
import json
import time
import pandas as pd
from PIL import Image
import google.generativeai as genai

# Configure API key
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("Error: GEMINI_API_KEY environment variable not set.")
    print("Please set it using: set GEMINI_API_KEY=your_key_here")
    exit(1)

genai.configure(api_key=api_key)

def extract_data(image_path):
    # Using gemini-2.5-flash as it supports multimodal input
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    try:
        img = Image.open(image_path)
    except Exception as e:
        print(f"Error opening image {image_path}: {e}")
        return []
        
    prompt = """
    You are an expert data extraction AI. Extract all the sales entries from this ledger image into a structured JSON list of objects.
    
    The table has columns: DATE, ITEM, QTY, UNIT PRICE, AMOUNT.
    
    For each valid row, create a JSON object with these exact keys:
    - date: The date. Pay CLOSE attention to the date. Parse DD-MM-YY or DD/MM/YY to YYYY-MM-DD. 
            If the year is '25', assume 2025. If the date is missing or unclear for a row, use the date from the previous row if available, or leave it null.
    - product: The item name (e.g., "Cement", "Floor tiles").
    - quantity: The quantity as a number (e.g., 3, 16).
    - price: The unit price as a number (e.g., 90.00, 170.00).
    - paid: The amount in the last column as a number (e.g., 270.00, 1840.00).
    
    IMPORTANT RULES:
    1. Do NOT include rows that are "Total" calculations.
    2. Ensure accurate reading of numbers and amounts. Pay good attention to the fields.
    3. Return ONLY valid JSON as a list of objects. No markdown formatting outside the JSON.
    """
    
    print(f"Sending request to Gemini for {os.path.basename(image_path)}...")
    
    for attempt in range(2): # Try twice max
        try:
            response = model.generate_content([prompt, img])
            text = response.text
            
            # Extract JSON from response
            start = text.find('[')
            end = text.rfind(']') + 1
            if start != -1 and end != 0:
                json_str = text[start:end]
                data = json.loads(json_str)
                return data
            else:
                print(f"No JSON list found in response for {image_path}")
                print("Raw response text was:")
                print(text)
                return []
        except Exception as e:
            if "429" in str(e) or "Quota exceeded" in str(e):
                if attempt == 0:
                    print("Rate limit hit (429). Waiting 30 seconds before retry...")
                    time.sleep(30)
                    continue # Retry loop
                else:
                    print("Rate limit hit again on retry. Giving up on this image.")
                    return []
            else:
                print(f"Error during extraction or parsing for {image_path}: {e}")
                return []
    return []

def main():
    inputs_dir = "inputs"
    
    if not os.path.exists(inputs_dir):
        print(f"Error: Inputs directory '{inputs_dir}' does not exist.")
        return
        
    # Get all img*.jpg files
    files = os.listdir(inputs_dir)
    images = [f for f in files if f.startswith('img') and f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    
    if not images:
        print(f"No images found in {inputs_dir} matching 'img*'")
        return
        
    # Sort files numerically to maintain order (img1, img2, ..., img10)
    # Extract the number part for sorting
    def get_num(filename):
        # Extract digits between 'img' and '.'
        base = os.path.splitext(filename)[0]
        num_str = base.replace('img', '')
        return int(num_str) if num_str.isdigit() else 0
        
    images.sort(key=get_num)
    
    print(f"Found {len(images)} images in {inputs_dir}.")
    print("Processing images with rate limiting...")
    
    all_data = []
    
    for img_name in images:
        image_path = os.path.join(inputs_dir, img_name)
        data = extract_data(image_path)
        if data:
            all_data.extend(data)
            print(f"Extracted {len(data)} records from {img_name}")
        else:
            print(f"Failed or no data extracted from {img_name}")
            
        # Respect rate limits
        print("Waiting 4 seconds to respect rate limits...")
        time.sleep(4)
            
    if not all_data:
        print("No data extracted from any image. Exiting.")
        return
        
    # Convert to DataFrame
    df = pd.DataFrame(all_data)
    
    # Add placeholders requested by user (retained from original script)
    df['customer'] = 'Old System'
    df['recorded_by'] = 'Manual'
    df['method'] = 'Cash'
    df['remarks'] = 'Manual Import'
    
    # Generate sequential invoice numbers
    df['invoice_no'] = [f"PINV-{i+1:04d}" for i in range(len(df))]
    
    # Reorder columns to match system expectations
    cols = ['date', 'invoice_no', 'customer', 'product', 'quantity', 'price', 'paid', 'method', 'recorded_by', 'remarks']
    # Filter to only existing columns to avoid errors if some were missed by AI
    existing_cols = [c for c in cols if c in df.columns]
    df = df[existing_cols]
    
    # Save to CSV
    output_path = "output.csv"
    try:
        df.to_csv(output_path, index=False)
        print(f"\nSuccess! Extracted {len(df)} records in total and saved to {output_path}")
        print("Please review the file before importing.")
    except Exception as e:
        print(f"Error saving Excel file: {e}")

if __name__ == "__main__":
    main()
