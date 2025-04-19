#!/bin/bash

OUTPUT_FILE="app_context.txt"
SCRIPT_NAME=$(basename "$0")

REQUIRED_FILES=(
    "package.json"
    "app.json"
    "tsconfig.json"
    "App.tsx"
)

EXCLUDED_FILES=("$SCRIPT_NAME" "$OUTPUT_FILE" "package-lock.json")

TREE_EXCLUDE_PATTERN='node_modules|android/build|ios/build|ios/Pods|.git|'"$OUTPUT_FILE"

echo "--- Starting to create $OUTPUT_FILE ---"

if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo "Warning: Not inside a git repository."
    echo "Using a fallback file listing method. Some files might be missed if .gitignore is not used."
    IS_GIT_REPO=false
else
     IS_GIT_REPO=true
fi

> "$OUTPUT_FILE"

echo "--- Start of Project Context ---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "--- Directory Structure (tree) ---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

if command -v tree >/dev/null 2>&1; then
    echo "Running 'tree'..."
    tree -a -L 3 -I "$TREE_EXCLUDE_PATTERN" . 2>&1 >> "$OUTPUT_FILE"
else
    echo "Warning: 'tree' command not found." >> "$OUTPUT_FILE"
    echo "Please install 'tree' to include directory structure (e.g., 'brew install tree' on macOS, 'sudo apt-get install tree' on Ubuntu/Debian, 'choco install tree' on Windows)." >> "$OUTPUT_FILE"
    echo "Directory structure could not be included." >> "$OUTPUT_FILE"
fi

echo "" >> "$OUTPUT_FILE"
echo "--- End Directory Structure (tree) ---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "--- File Contents ---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "Gathering file list..."

printf "%s\0" "${REQUIRED_FILES[@]}" > /tmp/context_files_$$

if [ "$IS_GIT_REPO" = true ]; then
    git ls-files --cached --others --exclude-standard -z >> /tmp/context_files_$$
fi

echo "Processing files..."
sort -z -u /tmp/context_files_$$ | while IFS= read -r -d '' file; do
    trap "rm -f /tmp/context_files_$$" EXIT

    if [ -f "$file" ]; then
        IS_EXCLUDED=false
        for excluded in "${EXCLUDED_FILES[@]}"; do
            if [ "$file" == "$excluded" ]; then
                IS_EXCLUDED=true
                break
            fi
        done

        if [ "$IS_EXCLUDED" = true ]; then
            echo "-> Skipping explicitly excluded file: $file"
            continue
        fi

        if file --mime-type -b "$file" | grep -q -e '^text/' -e 'application/json' -e 'application/javascript'; then
            echo "-> Including: $file"
            echo "--- File: $file ---" >> "$OUTPUT_FILE"
            cat "$file" >> "$OUTPUT_FILE"
            echo "" >> "$OUTPUT_FILE"
            echo "--- End File: $file ---" >> "$OUTPUT_FILE"
            echo "" >> "$OUTPUT_FILE"
        fi 
    fi
done

rm -f /tmp/context_files_$$

echo "--- End of File Contents ---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "--- End of Project Context ---" >> "$OUTPUT_FILE"

echo "--- Finished creating $OUTPUT_FILE ---"
echo "Review '$OUTPUT_FILE' to ensure it contains the desired information."
echo "Note: The script file '$SCRIPT_NAME' and the output file '$OUTPUT_FILE' were intentionally excluded from the file contents section."