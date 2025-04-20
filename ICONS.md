# Music Instrument Icons Specification

**Project:** Music School App

**Format:** PNG (Portable Network Graphics) with Transparency

**Style:** Flat design icon style

**Shapes:** Simple

**Lines:** Clean

**View:** Front view or easily recognizable profile view

**Position:** Centered within the icon boundaries

**Aspect Ratio:** Square

**Background:** **Transparent** (Essential for PNG icons)

**Effects:** No shadows, no gradients (or very subtle flat-style gradients if necessary for differentiation)

**Target Resolutions & File Naming:**
Generate icons suitable for the following resolutions, adhering to React Native's naming convention:
*   **Base Logical Size:** Aim for a clear representation at roughly 40x40 points.
*   **@1x:** `[instrument_name].png` - **40x40 pixels** (Optional but recommended)
*   **@2x:** `[instrument_name]@2x.png` - **80x80 pixels**
*   **@3x:** `[instrument_name]@3x.png` - **120x120 pixels**
    *(Note: It might be easiest to generate the highest resolution (120x120) first and then downscale accurately using an image editor to create the @2x and @1x sizes.)*

**Coloring:** Based on the "original" or typical color of the implied instrument, using flat color fills:

*   **Piano:**
    *   Body: Dark wood tone (e.g., dark brown or black)
    *   Keys: Alternating black and white
*   **Guitar:**
    *   Body and Neck: Various shades of brown wood
    *   Strings: Lighter tone (e.g., light grey or off-white)
    *   Tuning Pegs: Lighter metallic tone or light wood
*   **Drums:**
    *   Cymbals and Hardware: Metallic silver/grey
    *   Drum Bodies: Darker tones (e.g., black, dark blue, dark red, or dark wood)
*   **Violin:**
    *   Body, Neck, and Scroll: Warm brown wood tones
    *   Fingerboard: Black
    *   Tuning Pegs and Strings: Gold or silver
*   **Voice:**
    *   Stylized Lips/Mouth: Neutral or slightly warm skin tone
    *   Sound Wave: Lighter shade of the skin tone or a contrasting neutral tone
*   **Flute:**
    *   Body: Light silver
    *   Keywork: Slightly darker silver or grey accents
*   **Bass (Guitar):**
    *   Body and Neck: Darker wood tone (distinct from the regular guitar)
    *   Strings: Lighter tone (e.g., light grey or off-white), typically thicker and fewer in number than a regular guitar
    *   Tuning Pegs: Metallic or light wood

**Specific Instruments to be Included:**

*   Piano
*   Guitar
*   Drums
*   Violin
*   Voice (represented symbolically)
*   Flute
*   Bass (Guitar)

**Additional Notes:**

*   Maintain visual consistency across all icons in terms of style, line thickness (if applicable), and overall simplicity.
*   Focus on clear and recognizable silhouettes for each instrument, especially when viewed at smaller sizes.
*   Ensure crisp edges and avoid blurriness, particularly after resizing.