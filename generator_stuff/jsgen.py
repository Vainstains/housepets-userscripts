import csv
import json

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

if __name__ == "__main__":
    import os
    if not os.path.exists('generator_output'):
        os.makedirs('generator_output')

    js_code = csv_to_js_objects('generator_stuff/housepets_comics.csv', 'generator_output/comics.js')