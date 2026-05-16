import os
import shutil

def main():
    # Source directory in user's Downloads
    source_dir = r"C:\Users\gokro\Downloads\inputs"
    target_dir = "inputs"
    
    if not os.path.exists(source_dir):
        print(f"Error: Source directory '{source_dir}' does not exist.")
        print("Please ensure your images are in that folder.")
        return
        
    if not os.path.exists(target_dir):
        os.makedirs(target_dir)
        
    # Get all files in source
    try:
        files = os.listdir(source_dir)
    except Exception as e:
        print(f"Error reading directory {source_dir}: {e}")
        return
        
    # Filter for images
    images = [f for f in files if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    
    if not images:
        print(f"No images found in {source_dir}")
        return
        
    print(f"Found {len(images)} images in source folder.")
    
    # Sort them to maintain order (assuming alphabetical order matches page order)
    images.sort()
    
    print("Moving and renaming files...")
    for i, img in enumerate(images):
        src_path = os.path.join(source_dir, img)
        ext = os.path.splitext(img)[1]
        
        # New name format: img1.jpg, img2.jpg...
        target_name = f"img{i+1}{ext}"
        target_path = os.path.join(target_dir, target_name)
        
        try:
            # We use copy instead of move to keep your originals safe in Downloads!
            shutil.copy(src_path, target_path)
            print(f"✓ Copied {img} -> {target_name}")
        except Exception as e:
            print(f"✗ Failed to copy {img}: {e}")
            
    print(f"\n🎉 Successfully prepared {len(images)} images in '{target_dir}' directory.")
    print("They are now ready for the OCR script!")

if __name__ == "__main__":
    main()
