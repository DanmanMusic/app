#!/bin/bash

# This script creates a zip archive containing ICONS.md and the entire assets folder
# for use as context in AI image generation prompts.

ARCHIVE_NAME="icons_generation_context.zip"
ICON_SPEC_FILE="ICONS.md"
ASSETS_FOLDER="assets/instruments"

echo "Preparing to create zip archive: $ARCHIVE_NAME..."

# --- Basic Checks ---
# Check if ICONS.md exists
if [ ! -f "$ICON_SPEC_FILE" ]; then
    echo "Error: $ICON_SPEC_FILE not found in the current directory."
    exit 1
fi

# Check if assets folder exists
if [ ! -d "$ASSETS_FOLDER" ]; then
    echo "Error: $ASSETS_FOLDER directory not found in the current directory."
    exit 1
fi

# Check if zip command exists
if ! command -v zip &> /dev/null; then
    echo "Error: 'zip' command not found. Please install it (e.g., 'sudo apt install zip' or 'brew install zip')."
    exit 1
fi

# --- Create Archive ---
echo "Zipping $ICON_SPEC_FILE and $ASSETS_FOLDER..."

# Remove existing archive first to ensure a fresh build (optional)
rm -f "$ARCHIVE_NAME"

# Create the zip file: -r for recursive directory traversal
zip -r "$ARCHIVE_NAME" "$ICON_SPEC_FILE" "$ASSETS_FOLDER"

# --- Confirmation ---
# Check if zip command was successful (basic check based on exit code)
if [ $? -eq 0 ]; then
    echo "Successfully created $ARCHIVE_NAME"
    ls -lh "$ARCHIVE_NAME" # Show file size as confirmation
else
    echo "Error during zip creation."
    exit 1 # Exit with an error code
fi

exit 0