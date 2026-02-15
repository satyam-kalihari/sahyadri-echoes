export const MAHARASHTRA_BOUNDS = {
    north: 22.0,
    south: 15.6,
    west: 72.6,
    east: 80.9,
};

export const INITIAL_VIEW_STATE = {
    latitude: 19.7515,
    longitude: 75.7139,
    zoom: 6.5,
    bearing: 0,
    pitch: 0,
};

export interface MapLocation {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    description: string;
}

export const LOCATIONS: MapLocation[] = [
    {
        id: "mumbai",
        name: "Mumbai",
        latitude: 19.076,
        longitude: 72.8777,
        description: "The City of Dreams and gateway to India.",
    },
    {
        id: "pune",
        name: "Pune",
        latitude: 18.5204,
        longitude: 73.8567,
        description: " The Oxford of the East and cultural capital of Maharashtra.",
    },
    {
        id: "nashik",
        name: "Nashik",
        latitude: 19.9975,
        longitude: 73.7898,
        description: "The Wine Capital of India and a holy city.",
    },
    {
        id: "aurangabad",
        name: "Chhatrapati Sambhajinagar (Aurangabad)",
        latitude: 19.8762,
        longitude: 75.3433,
        description: "Gateway to the Ajanta and Ellora Caves.",
    },
    {
        id: "ajanta",
        name: "Ajanta Caves",
        latitude: 20.5519,
        longitude: 75.7033,
        description: "Ancient Buddhist rock-cut cave monuments.",
    },
    {
        id: "ellora",
        name: "Ellora Caves",
        latitude: 20.0268,
        longitude: 75.1771,
        description: "UNESCO World Heritage site featuring Hindu, Buddhist, and Jain monuments.",
    },
    {
        id: "nagpur",
        name: "Nagpur",
        latitude: 21.1458,
        longitude: 79.0882,
        description: "The Winter Capital and Orange City.",
    },
    {
        id: "kolhapur",
        name: "Kolhapur",
        latitude: 16.705,
        longitude: 74.2433,
        description: "Historical city known for its temples and cuisine.",
    },
    {
        id: "shaniwarwada",
        name: "Shaniwar Wada",
        latitude: 18.5196,
        longitude: 73.8553,
        description: "Historical fortification in the city of Pune.",
    },
    {
        id: "gateway",
        name: "Gateway of India",
        latitude: 18.922,
        longitude: 72.8347,
        description: "Arch-monument built in the 20th century in Mumbai.",
    }
];
