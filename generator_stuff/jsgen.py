import csv
import json
import os
import re

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

if __name__ == "__main__":
    # Generate the comic data JS
    comic_data_js = csv_to_js_objects('generator_stuff/housepets_comics.csv')
    
    # Process all userscript files
    process_userscript_files(comic_data_js)
    
    print("\nAll files processed successfully!")