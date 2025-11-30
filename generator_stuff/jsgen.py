import csv
import os
import re
import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

def csv_to_js_objects(csv_file_path, output_file_path=None):
    js_objects = []
    
    with open(csv_file_path, 'r', encoding='utf-8') as csvfile:
        reader = csv.DictReader(csvfile)
        
        for row in reader:
            js_object = "{"
            for key, value in row.items():
                if key in ['arc_number']:
                    val = -1
                    try:
                        val = int(str(round(float(value))))
                    except ValueError:
                        pass
                    js_object += f'{key}: "{val}", '
                elif value.isdigit():
                    js_object += f'{key}: "{value}", '
                else:
                    escaped_value = value.replace('"', '\\"')
                    js_object += f'{key}: "{escaped_value}", '
            js_object = js_object.rstrip(', ') + "}"
            js_objects.append(js_object)
    js_output = "const comicData = [\n    " + ",\n    ".join(js_objects) + "\n];"
    
    if output_file_path:
        with open(output_file_path, 'w', encoding='utf-8') as outfile:
            outfile.write(js_output)
    
    return js_output

def process_userscript_files(comic_data_js):
    """Process all JS files in userscripts_base/ and replace comic data section"""
    
    # Ensure output directory exists
    if not os.path.exists('generator_output'):
        os.makedirs('generator_output')
    
    # Pattern to match the comic data section
    pattern = r'// <COMIC_DATA>\n.*?\n// </COMIC_DATA>'
    
    # Process each file in userscripts_base directory
    userscripts_dir = 'userscripts_base'
    if not os.path.exists(userscripts_dir):
        print(f"Error: Directory '{userscripts_dir}' not found")
        return
    
    for filename in os.listdir(userscripts_dir):
        if filename.endswith('.js'):
            input_path = os.path.join(userscripts_dir, filename)
            output_path = filename
            
            print(f"Processing {filename}...")
            
            try:
                with open(input_path, 'r', encoding='utf-8') as infile:
                    content = infile.read()
                replacement = f'// <COMIC_DATA>\n{comic_data_js}\n// </COMIC_DATA>'
                new_content = re.sub(pattern, replacement, content, flags=re.DOTALL)
                with open(output_path, 'w', encoding='utf-8') as outfile:
                    outfile.write(new_content)
                
                print(f"  -> Successfully created {output_path}")
                
            except Exception as e:
                print(f"  -> Error processing {filename}: {str(e)}")

def regenerate_all():
    """Regenerate all userscripts"""
    print(f"\n[{time.strftime('%H:%M:%S')}] Regenerating userscripts...")
    try:
        comic_data_js = csv_to_js_objects('generator_stuff/housepets_comics.csv')
        process_userscript_files(comic_data_js)
        print(f"[{time.strftime('%H:%M:%S')}] ✓ Regeneration complete!\n")
    except Exception as e:
        print(f"[{time.strftime('%H:%M:%S')}] ✗ Error during regeneration: {str(e)}\n")

class FileChangeHandler(FileSystemEventHandler):
    def __init__(self):
        self.last_modified = {}
        self.debounce_seconds = 0.5
    
    def on_modified(self, event):
        if event.is_directory:
            return
        
        # Get the file path
        file_path = event.src_path
        
        # Check if it's a file we care about
        if file_path.endswith('.csv') or (file_path.endswith('.js') and 'userscripts_base' in file_path):
            # Debounce: ignore if modified too recently
            current_time = time.time()
            if file_path in self.last_modified:
                if current_time - self.last_modified[file_path] < self.debounce_seconds:
                    return
            
            self.last_modified[file_path] = current_time
            print(f"[{time.strftime('%H:%M:%S')}] Detected change in: {file_path}")
            regenerate_all()

if __name__ == "__main__":
    print("=" * 60)
    print("File Watcher Started")
    print("=" * 60)
    print("Watching:")
    print("  - generator_stuff/housepets_comics.csv")
    print("  - userscripts_base/*.js")
    print("\nPress Ctrl+C to stop\n")
    
    # Do initial generation
    regenerate_all()
    
    # Set up file watcher
    event_handler = FileChangeHandler()
    observer = Observer()
    
    # Watch the CSV directory
    observer.schedule(event_handler, 'generator_stuff', recursive=False)
    
    # Watch the userscripts_base directory
    observer.schedule(event_handler, 'userscripts_base', recursive=False)
    
    observer.start()
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print(f"\n[{time.strftime('%H:%M:%S')}] Stopping file watcher...")
        observer.stop()
    
    observer.join()
    print("File watcher stopped.")