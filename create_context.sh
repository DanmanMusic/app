#!/bin/bash

set -e # Exit immediately if a command exits with a non-zero status.

# --- Configuration ---
OUTPUT_DIR="ai"
SCRIPT_NAME=$(basename "$0")
# --- MODIFIED LINE HERE ---
# Added .expo to the exclusion list for the tree command
TREE_EXCLUDE_PATTERN='node_modules|.expo|android/build|ios/build|ios/Pods|.git|'"$OUTPUT_DIR"
# Files to always ignore when building contexts
GLOBAL_EXCLUDED_FILES=("$SCRIPT_NAME" "package-lock.json" "create_context.sh")

# --- Helper: The Builder Function ---
# This function does the heavy lifting.
build_context() {
    local output_file="$OUTPUT_DIR/$1"
    local description="$2"
    shift 2 # The rest of the arguments are the paths to include
    local paths=("$@")
    local all_files=()

    echo "--- Building context: $1 ---"

    # Create header for the context file
    echo "--- Project Context: $description ---" > "$output_file"
    echo "--- Generated on: $(date) ---" >> "$output_file"
    echo "" >> "$output_file"

    # Conditionally run the tree command only for the 'docs_and_structure' context.
    if [[ "$1" == "context_docs_and_structure.txt" ]]; then
        echo "    -> Including directory tree..."
        echo "--- Directory Structure (tree) ---" >> "$output_file"
        # Robustly check if 'tree' command exists before trying to run it
        if command -v tree >/dev/null 2>&1; then
            tree -I "$TREE_EXCLUDE_PATTERN" . >> "$output_file"
        else
            echo "!!! WARNING: 'tree' command not found. Cannot include directory structure. !!!" >> "$output_file"
            echo "!!! On macOS, install with: brew install tree !!!" >> "$output_file"
            echo "!!! On Debian/Ubuntu, install with: sudo apt-get install tree !!!" >> "$output_file"
        fi
        echo "--- End Directory Structure (tree) ---" >> "$output_file"
        echo "" >> "$output_file"
    fi


    # Gather all files from specified paths
    for path in "${paths[@]}"; do
        if [ -d "$path" ]; then
            while IFS= read -r file; do all_files+=("$file"); done < <(find "$path" -type f)
        elif [ -f "$path" ]; then
            all_files+=("$path")
        fi
    done

    # De-duplicate and process files
    printf "%s\n" "${all_files[@]}" | sort -u | while IFS= read -r file; do
        # Skip this script and other globally excluded files
        for excluded in "${GLOBAL_EXCLUDED_FILES[@]}"; do
            if [[ "$(basename "$file")" == "$excluded" ]]; then continue 2; fi
        done

        # Check for text-based files and include them
        if file --mime-type -b "$file" | grep -q -e '^text/' -e 'application/json' -e 'application/javascript' -e 'application/x-sql' -e 'application/x-shellscript'; then
            echo "    -> Including file content: $file"
            echo "--- File: $file ---" >> "$output_file"
            cat "$file" >> "$output_file"
            echo "" >> "$output_file"
            echo "--- End File: $file ---" >> "$output_file"
            echo "" >> "$output_file"
        fi
    done
    echo "--- Finished building $1 ---"
    echo ""
}


# --- Main Execution: The Orchestrator ---

echo "--- Starting Context Generation ---"

# Clean and create output directory
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# --- Define and Build the Three Core Context Packages ---

# 1. Documentation, Core Configs, and Project Structure
# The tree structure will now be added to this context file.
build_context "context_docs_and_structure.txt" \
    "Core configuration, documentation, and overall project structure." \
    "package.json" "app.json" "tsconfig.json" "eas.json" "README.md" "TODO.md" "SPECIFICATION.md" "MODEL.md" "google-services.json" "eslint.config.js"

# 2. All Supabase Backend Code
build_context "context_backend_supabase.txt" \
    "The entire Supabase backend: database migrations and edge functions." \
    "supabase/"

# 3. All Frontend Application Code
build_context "context_frontend_app.txt" \
    "The complete React Native frontend application source code." \
    "src/" "App.tsx" "index.ts"  

# --- Completion ---
echo "--- Context generation complete! ---"
echo "Output files are in the '$OUTPUT_DIR/' directory:"
ls -1 "$OUTPUT_DIR"
echo "-----------------------------------"