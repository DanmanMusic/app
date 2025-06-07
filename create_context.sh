#!/bin/bash

set -e # Exit immediately if a command exits with a non-zero status.

# --- Configuration ---
OUTPUT_DIR="contexts"
SCRIPT_NAME=$(basename "$0")
TREE_EXCLUDE_PATTERN='node_modules|android/build|ios/build|ios/Pods|.git|'"$OUTPUT_DIR"
GLOBAL_EXCLUDED_FILES=("$SCRIPT_NAME" "app_context.txt" "package-lock.json" "create_icons_zip.sh" "create_context.sh")

# --- Helper: The Builder Function ---
# This function does the heavy lifting.
# Usage: build_context "output_filename.txt" "Context Description" "dir1" "dir2" "file1" "file2" ...
build_context() {
    local output_file="$OUTPUT_DIR/$1"
    local description="$2"
    shift 2
    local paths=("$@")
    local all_files=()

    echo "--- Building context: $1 ---"
    
    # Create header for the context file
    echo "--- Project Context: $description ---" > "$output_file"
    echo "--- Generated on: $(date) ---" >> "$output_file"
    echo "" >> "$output_file"

    # Add directory tree to the 'core' context for overall structure
    if [[ "$1" == "context_core.txt" ]]; then
        echo "--- Directory Structure (tree) ---" >> "$output_file"
        if command -v tree >/dev/null 2>&1; then
            tree -a -L 3 -I "$TREE_EXCLUDE_PATTERN" . >> "$output_file"
        else
            echo "Warning: 'tree' command not found. Cannot include directory structure." >> "$output_file"
        fi
        echo "--- End Directory Structure (tree) ---" >> "$output_file"
        echo "" >> "$output_file"
    fi

    # Gather all files from specified paths
    for path in "${paths[@]}"; do
        if [ -d "$path" ]; then
            # Find all files in the directory, excluding certain patterns
            while IFS= read -r file; do
                all_files+=("$file")
            done < <(find "$path" -type f)
        elif [ -f "$path" ]; then
            all_files+=("$path")
        fi
    done

    # De-duplicate and process files
    printf "%s\n" "${all_files[@]}" | sort -u | while IFS= read -r file; do
        # Skip globally excluded files
        for excluded in "${GLOBAL_EXCLUDED_FILES[@]}"; do
            if [[ "$file" == "$excluded" ]]; then
                continue 2
            fi
        done

        # Check for text-based files
        if file --mime-type -b "$file" | grep -q -e '^text/' -e 'application/json' -e 'application/javascript' -e 'application/x-sql'; then
            echo "    -> Including: $file"
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

# --- Define and Build Context Packages ---

build_context "context_core.txt" \
    "Core project configuration, entrypoint, and overall structure." \
    "package.json" "app.json" "tsconfig.json" "App.tsx" "index.ts" "README.md"

build_context "context_documentation.txt" \
    "High-level project planning, specifications, and data models." \
    "TODO.md" "SPECIFICATION.md" "MODEL.md" "ICONS.md"

build_context "context_backend_database.txt" \
    "Supabase database schema, migrations, and seed scripts." \
    "supabase/migrations" "supabase/sql"

build_context "context_backend_functions.txt" \
    "Server-side business logic via Supabase Edge Functions." \
    "supabase/functions"

build_context "context_frontend_views.txt" \
    "Top-level React Native view components for each user role." \
    "src/views"

build_context "context_frontend_components_admin.txt" \
    "All React Native components specific to the Admin dashboard." \
    "src/components/admin"

build_context "context_frontend_components_common.txt" \
    "Shared, reusable React Native components used across multiple views." \
    "src/components/common"

build_context "context_frontend_state.txt" \
    "Client-side state management (React Context) and data-fetching hooks." \
    "src/contexts" "src/hooks"

build_context "context_frontend_api_and_types.txt" \
    "Client-side API wrappers for Supabase and TypeScript type definitions." \
    "src/api" "src/types" "src/lib" # Lib is closely related

build_context "context_frontend_styling.txt" \
    "Shared styling variables and stylesheets." \
    "src/styles"

# --- Completion ---
echo "--- Context generation complete! ---"
echo "Output files are in the '$OUTPUT_DIR/' directory:"
ls -1 "$OUTPUT_DIR"
echo "-----------------------------------"