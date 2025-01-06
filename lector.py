import sys
import os

def merge_files_recursive(input_dir, output_file):
    """
    Recorre recursivamente `input_dir` con os.walk,
    toma cada archivo y agrega su contenido (más un encabezado) 
    al archivo de salida.
    """

    if not os.path.isdir(input_dir):
        print(f'Error: "{input_dir}" no es un directorio válido.')
        sys.exit(1)

    # Abrimos el archivo de salida en modo 'write' (sobrescribe si ya existe).
    # Si quisieras añadir en vez de sobrescribir, usarías 'a' (append).
    with open(output_file, 'w', encoding='utf-8') as out:
        # Recorremos todas las carpetas, subcarpetas y archivos
        for root, dirs, files in os.walk(input_dir):
            for name in files:
                path = os.path.join(root, name)
                # Aquí podrías filtrar extensiones si quieres,
                # por ejemplo: if name.endswith(('.js', '.py')):
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        content = f.read()
                except (UnicodeDecodeError, PermissionError) as e:
                    # Saltamos archivos que no se puedan leer (binarios, etc.)
                    print(f"[Aviso] No se pudo leer {path}: {e}")
                    continue

                # Escribimos un encabezado para identificar cada archivo
                out.write("\n=======================================\n")
                out.write(f"Archivo: {path}\n")
                out.write("=======================================\n")
                out.write(content)
                out.write("\n\n")  # separador final

    print(f"¡Hecho! Archivo generado: {output_file}")

def main():
    if len(sys.argv) < 3:
        print("Uso: python merge_files_recursive.py <directorio_entrada> <archivo_salida>")
        sys.exit(1)

    input_dir = sys.argv[1]
    output_file = sys.argv[2]
    
    merge_files_recursive(input_dir, output_file)

if __name__ == "__main__":
    main()