// src/mocks/mockInstruments.ts

export interface Instrument {
    id: string;
    name: string;
    // Could add other properties like image, category etc. later if needed
}

export const mockInstruments: Instrument[] = [
    { id: 'inst-1', name: 'Piano' },
    { id: 'inst-2', name: 'Guitar' },
    { id: 'inst-3', name: 'Drums' },
    { id: 'inst-4', name: 'Violin' },
    { id: 'inst-5', name: 'Voice' },
    { id: 'inst-6', name: 'Flute' },
    { id: 'inst-7', name: 'Bass Guitar' }, // Added based on a reward item
    // Add more instruments as needed
];